// lib/mechanics/ffxiv/fru/enter-the-dragon.ts
//
// Futures Rewritten Phase 4 (Enter the Dragon) per-pull rules. Entry point:
// detectEnterTheDragonErrors. Self-gates on Materialization; runs from
// Memory's End passing (where oracle-of-darkness.ts stops) to the Phase 5
// transition, the enrage or Paradise Lost. The fallback model
// (fallback.ts MODULE_PHASES) stays out of P4. Reads the crystal's hits
// from the enemyDamageTaken stream (NpcHit, built in log-transforms.ts).
//
// -- VERIFIED AGAINST LOGS (2026-10-12) --
// 46 pulls that reached P4, no VODs, no raid plan. One static (same
// roster) in A-G and V-X, fetched `--min-minutes 10.15 --from-minutes 6.9
// --to-minutes 14` (V-X refetched to 14 with --refetch --fight):
//   A bMKCyQ6WR3zANaZn (8, the six P4 clears A3/A4/A5/A9/A10/A11),
//   B Mqvg2fyB7mRknW39 (5), C hV4W6banqAHvmtPy (6), D vczMCgKYF1GxW2pD (2),
//   E jdrAFDkv2yh9TM7g (7), F qv2GdYrB1NL7KkfR (3), G Brpq6dR9QfL3AMaH (9),
//   V abPA9dLJVD4rn6Zq (1), W yWrQA4ac1VfMhgR7 (2), X cQL739vDqXgxhAPy (2).
//   Z ZkXwDLTnpcdt4KaA pull 10: another static, cut at 10.75 minutes.
// Cited as G14 +105.9: pull, seconds after Materialization (10:14-10:18 in).
// Clock (every pull within ~0.5s): Materialization +0, Drachen Armor +11.2,
// Akh Rhai puddles +13.7 (ten pulses), dual autos +15/+18/+21 and +56,
// Edge of Oblivion pulses +17/+56/+94/+153 (four, no Depths of Oblivion),
// Darklit Dragonsong +25.7 (raidwide +26.6, Chains +26.6 for 7s, Fate for
// 14s), towers and cones +36.8 (hits +37.5), Spirit Taker +41, Darklit
// Waters +44.7, half-room Hallowed Wings +46.4, Somber Dance +49.5/+52.8,
// Akh Morn +61.5 (four volleys ~1.1s apart), Morn Afah +71.7 (hit +73.3),
// Crystallize Time +87.3 (raidwide +88), CT Water +100.2, first dragon
// pops +102.4, Ice/Aero/Eruption +102.2 (hits +102.8), Unholy +105.2,
// Aero pops +107, Tidal Light +108-120, Quietus +119.2, Return +121.1,
// Spirit Taker +124.5, Stun +128.1, rewind Wings hits +132.0/+136.5, Akh
// Morn +144.3, Morn Afah +154.5, then the transition (9d27, 40231) at
// +166-175, or both enrages (Absolute Zero 40245 / Memory's End 40305)
// at +167.6. The bad ending's Paradise Lost (40263) came at +195 (G14).
// Log IDs (cactbot/guide candidates checked by name and stream):
// - Shiva's dragon-form autos: 40177 on her top enmity, 40178 ("great
//   wyrm") on her second. Gaia's autos are Attack 40264.
// - Akh Rhai 40238 (Damage Down). Darklit Dragonsong 40239; Lightsteeped
//   1002257 (stack count; three at Darklit); Bright Hunger towers 40213
//   (+1, two each), The Path of Light cones 40190 (+1, one each; cast
//   target = the bait while it hit one); a fifth stack explodes as
//   Lightsteep 40216 on everyone. Refulgent Chain 1002253 -> Refulgent
//   Fate 1002255; a break is the cast 40215 (Damage Down; also P2's ID).
// - Darklit Water: Spell-in-Waiting Dark Water III 1002461 (19s), damage
//   40271, two instances of four. Spirit Taker 40289, half-room Hallowed
//   Wings 40227 / 40228, Somber Dance 40284 (farthest) / 40285 (nearest).
// - Akh Morn 40302 (Gaia) + 40247 (Shiva) casts; volleys 40303 (Gaia)
//   and 40248 (Shiva); Light's / Darkness's Design 1004160 / 1004161 on
//   whoever each hit. Morn Afah casts 40304 / 40249 carry each boss's HP;
//   the stack is 40250.
// - Crystallize Time 40298. Wyrmclaw 1003263 (17s Ice reds, 40s Aero
//   reds), Wyrmfang 1003264 (40s blues); waiting Water 1002461 (12s),
//   Blizzard 1002462, Eruption 1002460, Aero 1002463 (14s), Unholy
//   1002454 (17s), Quietus 1004174, Return 1004208/1002452 -> Stun
//   1004163. Longing of the Lost 40241 (a head popped; the red's claw ends
//   at that millisecond), Dark Aero III 40280 (one cast targeted the solo
//   holder, the other untargeted on the party), Dark Blizzard III 40279,
//   Dark Eruption 40274, Unholy Darkness 40277, Maelstrom 40299 and Tidal
//   Light 40252/40253 (Damage Down), Quietus 40281, Joyless Dragonsong
//   40242 (a head finishing its lap), rewind Hallowed Wings 40332 (Magic
//   Vulnerability Up 1002941 on the four nearest each).
// - The memory crystal is the actor "fragment of fate" (Edge of Oblivion
//   40174 is its pulse). Its hits are in enemyDamageTaken only: scripted
//   in every clear from Darklit, the half wing, CT, Maelstrom, Tidal Light,
//   Quietus (three) and both rewind wings.
// Model questions the log answered:
// - Clean pattern, every clear: 7-1 Akh Morn (the OT solo on Gaia first,
//   the MT solo on Shiva second), Morn Afah on all eight, one tank taking
//   both Somber Dances under Living Dead, chained players in the towers.
// - Crystallize Time's first stacks never varied in 21 resolutions with
//   everyone alive: Water = blue Water/Blizzard/Unholy + one Aero red,
//   party Aero = those three + its holder, Unholy = all four blues + one
//   Ice red. Under four (Water) / five (Unholy) gave Mark of Mortality.
// - Morn Afah's HP gate: the stack survived 4.8 points (F1), not 6.0 (G5).
//   With a 10.9-18.3-point gap the static's MT took it alone and died
//   (E1/E5/E8/B10); they also did so at 3.4/-1.0/3.6 (A4, G1, B1).
// - Rewind wings: a tank was in both front fours in five clears; non-tanks
//   in both died under the vulnerability (A1, A8, G1, G10, G11, G13).
// - A crystal hit by Unholy Darkness (B5/F1/G14) or a head's Longing
//   (E12/G11) took no Quietus hit afterwards: shattered. After Dark Eruption
//   (C9) it took all three. G14 cleared Phase 4's mechanics and was wiped
//   by Paradise Lost.
// - No killing blow: Wyrmfang/Wyrmclaw running out (+128.1 = 40s), Mark of
//   Mortality, Walking Dead running out, knockbacks out of the arena by the
//   rewind wings, Dark Aero III, a red's own Longing or Spirit Taker, and
//   Damage Down resets (players kept walking out with one before P5).
// - Darklit Dragonsong killed full-HP players in V22/W8 (mitigation, not
//   a mechanic); Crystallize Time's raidwide did the same in E1 after the
//   MT's sacrifice. Neither is a rule.
// Cutoffs (first Raid error) of the 40 non-clears: collapse 22 (Darklit
// raidwide V22/W4/W8, the CT stacks and knockbacks, the rewind wings),
// crystal shattered 5, Lightsteep 5, Akh Morn 3, Morn Afah 3, Refulgent
// Fate 1 (C10), enrage 1 (E5). Wipes with nobody named before the cutoff:
// W8 (the raidwide) and C6 (an Aero red died at the CT Water with no
// killing blow, then the Aero went off on their body).
// VOD review 2026-10-12 (user): report j6Zhc8kNYKrFWAGT (the user's
// static, 2025-01-28; Materialization 10:14-10:17), pulls 6 and 14;
// rulings in expectations/rulings.json. It set:
// - the lone Darklit Water holder late to the stack (6 +44.7: the PCT;
//   the three missing stood together);
// - a chain broken by a shared Spirit Taker's knock being that jump's
//   fallout (14 +43.4).
// - Spirit Taker 14 +43.0: the NIN should have spread to the D marker,
//   the SGE was fine. Not readable (positions too sparse; see
//   oracle-of-darkness.ts), so both stay named.
//
// -- RULES IMPLEMENTED --
// ffxiv-etd-autos: Shiva's second auto on a non-tank names the tank who
//   took neither (Major on a death). Exposure: the tanks.
// ffxiv-etd-akh-rhai (Major, Damage Down); 4+ at once is player-less.
// ffxiv-etd-lightsteep (Major): with all alive, everyone reaching five
//   Lightsteeped (and what gave it); Raid when Lightsteep killed 4+.
// ffxiv-etd-chain (Major): a Refulgent Chain broken by its own end, not a
//   death or a shared Spirit Taker's knock within 1.5s; Raid when it killed
//   4+.
// ffxiv-etd-water: Darklit Waters with all alive: both holders on one side
//   (both named), missing or doubled players; a Water that hit only its
//   holder while the missing stood together 4y+ away names the holder.
// ffxiv-etd-mark: a Mark of Mortality no error accounts for.
// ffxiv-etd-spirit-taker: a shared jump. ffxiv-etd-wings: the half-room
//   wing. ffxiv-etd-tank-buster: non-tanks hit by Somber Dance (exposure:
//   the non-tanks).
// ffxiv-etd-akh-morn: both bosses' volleys on one player with both tanks
//   alive (the Provoker alone when they took the other tank's boss, else
//   both tanks); a solo tank dying to it. Raid when it killed 4+.
//   Exposure: the tanks.
// ffxiv-etd-morn-afah: a gap over 5 points with a sacrificed tank is a
//   player-less note; a player alone under 5 points who died is named;
//   Raid when it killed 4+.
// ffxiv-etd-unholy: the CT Water and Unholy missing a blue player, or
//   lacking an Aero / Ice red (both named). ffxiv-etd-aero: both Aero
//   holders together. ffxiv-etd-blizzard / -avoidable (Major, Damage
//   Down): Dark Blizzard III, Maelstrom, Tidal Light. ffxiv-etd-longing:
//   non-poppers hit by Longing. ffxiv-etd-wyrm (Major): a claw or fang
//   running out (player-less when fewer than four heads popped).
// ffxiv-etd-rewind-wings: a non-tank in both wings' front four, all alive.
// ffxiv-etd-crystal: the owner of an attack that hit the crystal (Major
//   when it shattered; Minor otherwise) and a Raid on the shattering hit;
//   Paradise Lost is a Raid too. ffxiv-etd-dragon-head (Raid): Joyless
//   Dragonsong. ffxiv-etd-wall (Major): knocked or walked out.
// ffxiv-etd-enrage / -called-wipe / -collapse (Raid; collapse at four dead).
// The Damage Down causes are excluded from ffxiv-damage-down (error-rules.ts).
// Not built: Darklit tower under/over-soak by itself (only seen with a
// death), who aims a cone, the bowtie/Mami presets, Edge of Oblivion and
// raidwide deaths (mitigation), CT positions, Tidal/rewind corner snapshots,
// beacon ownership (who took which), Dark Eruption on others.
//
// -- GUIDE-DERIVED MODEL: ENTER THE DRAGON (FRU PHASE 4) --
// Futures Rewritten (Ultimate), patch 7.11 origin; checked 2026-10-09.
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

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent, NpcHit } from "@/types/PullError";
import type { ReportedOccurrence } from "@/lib/mechanics/occurrences";
import { kFmt, joinNames, playerError, playerlessMinor, raidMarker, clusterByGap } from "@/lib/mechanics/wow/common";
import { interpolatePlayerPosition } from "@/lib/mechanics/player-position";
import {
  DAMAGE_DOWN, MARK_OF_MORTALITY, DEATH_EVENT_LAG_MS, type Hit, type Life,
  buildLife, hitsOf, castsOf, uniq, namesOf, isTank, realAmount, allAlive, byPlayer, unexplainedMarks,
} from "./common";

export const ETD_AUTOS_RULE_ID       = "ffxiv-etd-autos";
export const ETD_AKH_RHAI_RULE_ID    = "ffxiv-etd-akh-rhai";
export const ETD_LIGHTSTEEP_RULE_ID  = "ffxiv-etd-lightsteep";
export const ETD_CHAIN_RULE_ID       = "ffxiv-etd-chain";
export const ETD_WATER_RULE_ID       = "ffxiv-etd-water";
export const ETD_SPIRIT_RULE_ID      = "ffxiv-etd-spirit-taker";
export const ETD_WINGS_RULE_ID       = "ffxiv-etd-wings";
export const ETD_BUSTER_RULE_ID      = "ffxiv-etd-tank-buster";
export const ETD_AKH_MORN_RULE_ID    = "ffxiv-etd-akh-morn";
export const ETD_AFAH_RULE_ID        = "ffxiv-etd-morn-afah";
export const ETD_UNHOLY_RULE_ID      = "ffxiv-etd-unholy";
export const ETD_AERO_RULE_ID        = "ffxiv-etd-aero";
export const ETD_BLIZZARD_RULE_ID    = "ffxiv-etd-blizzard";
export const ETD_LONGING_RULE_ID     = "ffxiv-etd-longing";
export const ETD_WYRM_RULE_ID        = "ffxiv-etd-wyrm";
export const ETD_AVOIDABLE_RULE_ID   = "ffxiv-etd-avoidable";
export const ETD_REWIND_RULE_ID      = "ffxiv-etd-rewind-wings";
export const ETD_CRYSTAL_RULE_ID     = "ffxiv-etd-crystal";
export const ETD_DRAGON_RULE_ID      = "ffxiv-etd-dragon-head";
export const ETD_WALL_RULE_ID        = "ffxiv-etd-wall";
export const ETD_ENRAGE_RULE_ID      = "ffxiv-etd-enrage";
export const ETD_CALLED_WIPE_RULE_ID = "ffxiv-etd-called-wipe";
export const ETD_COLLAPSE_RULE_ID    = "ffxiv-etd-collapse";
export const ETD_MARK_RULE_ID        = "ffxiv-etd-mark";

// ── log IDs (VERIFIED above) ────────────────────────────────────────────────

const MATERIALIZATION  = 40246;              // Phase 4's first cast
const MEMORYS_END_PASS = 40335;              // Phase 3 passed (oracle-of-darkness.ts)
const AUTO_FIRST       = 40177;              // Shiva-as-dragon's auto on her top enmity
const AUTO_SECOND      = 40178;              // ...and on her second ("great wyrm")
const AKH_RHAI         = 40238;
const DARKLIT          = 40239;
const LIGHTSTEEPED     = 1002257;
const LIGHTSTEEP       = 40216;              // a fifth Lightsteeped stack's explosion
const REFULGENT_CHAIN  = 1002253;
const FATE_STATUS      = 1002255;
const REFULGENT_FATE   = 40215;              // a chain breaking
const BRIGHT_HUNGER    = 40213;              // the two towers
const PATH_OF_LIGHT    = 40190;              // the four cones
const W_WATER          = 1002461;
const W_BLIZZARD       = 1002462;
const W_ERUPTION       = 1002460;
const W_UNHOLY         = 1002454;
const W_AERO           = 1002463;
const DARK_WATER       = 40271;
const SPIRIT_TAKER     = 40289;
const HALF_WINGS       = [40227, 40228];     // Darklit's half-room Hallowed Wings
const SOMBER_FAR       = 40284;
const SOMBER_NEAR      = 40285;
const AKH_MORN_START   = 40302;              // Gaia's Akh Morn cast; Shiva's 40247 starts with it
const AKH_MORN_SHIVA   = 40248;
const AKH_MORN_GAIA    = 40303;
const AFAH_GAIA        = 40304;
const AFAH_SHIVA       = 40249;
const MORN_AFAH        = 40250;
const CRYSTALLIZE      = 40298;
const WYRMCLAW         = 1003263;
const WYRMFANG         = 1003264;
const LONGING          = 40241;
const DARK_AERO        = 40280;
const DARK_BLIZZARD    = 40279;
const DARK_ERUPTION    = 40274;
const UNHOLY           = 40277;
const MAELSTROM        = 40299;
const TIDAL_LIGHT      = [40252, 40253];
const QUIETUS          = 40281;
const JOYLESS          = 40242;              // a dragon head finished its lap
const REWIND_WINGS     = 40332;
const MAGIC_VULN       = 1002941;
const WALKING_DEAD     = 1000811;
const ABSOLUTE_ZERO    = 40245;              // Shiva's enrage
const MEMORYS_END      = 40305;              // Gaia's enrage; begun but never finished in a clear
const TRANSITION       = 40231;              // both bosses down: Phase 5 follows
const PARADISE_LOST    = 40263;              // the bad ending's wipe
const PROVOKE          = "Provoke";
const SHIVA_NAME       = "Usurper of Frost";
const GAIA_NAME        = "Oracle of Darkness";
const CRYSTAL_RE       = /^fragment of fate$/i;

// ── thresholds (with the extremes behind them) ──────────────────────────────

const EPISODE_MS = 3000;
// This many hit by one mechanic at once is the group misreading it.
const GROUP_HIT = 4;
// Morn Afah: the stack survived a gap of up to 4.8 points (F1 +71.7, 8 hit,
// 106-118k each); 6.0 killed all seven in it (G5 +154.3).
const AFAH_GAP_PCT = 5;
// Darklit Water and the Crystallize Time Water need four, the Unholy five:
// fewer gave Mark of Mortality (Water 3: B10/E5/G1/G8; Unholy 4: C9/E6/E11/E12).
const WATER_MIN  = 4;
// Darklit Water hitting only its holder: the missing players within this of
// their centroid, the holder this far from it (j6Zhc8 6: 1.6y and 5.4y).
const LONE_WATER_GROUP_YD = 3;
const LONE_WATER_AWAY_YD  = 4;
// A chain end that broke this soon after its holder was knocked by a shared
// Spirit Taker (j6Zhc8 14 +43.4: 0.4s) is the knockback's fallout.
const KNOCKED_CHAIN_MS = 1500;
const UNHOLY_MIN = 5;
// No-killing-blow deaths 2.0-5.6s after a knockback hit: Hallowed Wings after
// the rewind (A1 3.7-5.3s, G9 2.1s), Dark Aero III (C3/F2 2.5-3.2s), a red's
// own Longing of the Lost (C2/C9/E6 4.1-4.3s), Spirit Taker (B10 2.7s).
const KNOCK_MIN_MS = 1900;
const KNOCK_MAX_MS = 5800;
const DD_RESET_MS          = 36_000;
const RESET_AFTER_DEATH_MS = 8000;
const SILENT_HIT_MS        = 3500;
const CALLED_WIPE_COUNT    = 3;
const CALLED_WIPE_WINDOW   = 10_000;
const CALLED_WIPE_END_MS   = 12_000;
const CALLED_WIPE_RAID_DEAD = 4;
// No P4 clear had more than two dead at once; every pull that reached four
// failed (G1 and G13 enraged with four down, the rest wiped).
const COLLAPSE_DEAD_COUNT  = 4;

// ── helpers ─────────────────────────────────────────────────────────────────

const instKey = (e: PlayerEvent) => `${e.source}#${e.sourceInstance}`;
const instancesOf = (hits: Hit[]) => {
  const m = new Map<string, Hit[]>();
  for (const h of hits) m.set(instKey(h.e), [...(m.get(instKey(h.e)) ?? []), h]);
  return m;
};
const playersOf = (hits: Hit[]) => uniq(hits.map((h) => h.p));
const diedIn = (life: Life, hits: Hit[]) => uniq(hits.filter((h) => life.diedFrom(h.p, h.e.timestamp)).map((h) => h.p));
const hitsIn = (players: PlayerInfo[], life: Life, ids: number | number[], from: number, to: number) =>
  hitsOf(players, life, ids, to).filter((h) => h.e.timestamp >= from);
const sumOf = (es: PlayerEvent[]) => kFmt(es.reduce((s, e) => s + realAmount(e), 0));
const momIn = (players: PlayerInfo[], cause: number, t: number) =>
  players.filter((p) => p.debuffs.some((e) => e.abilityId === MARK_OF_MORTALITY && e.debuffStatus === "applied" && e.causeAbilityId === cause && Math.abs(e.timestamp - t) <= 2000));
const appliedIn = (p: PlayerInfo, id: number, from: number, to: number) =>
  p.debuffs.find((e) => e.abilityId === id && e.debuffStatus === "applied" && e.timestamp >= from && e.timestamp <= to);
const removedNear = (p: PlayerInfo, id: number, t: number, ms: number) =>
  p.debuffs.find((e) => e.abilityId === id && e.debuffStatus === "removed" && Math.abs(e.timestamp - t) <= ms);
/** The player's killing hit landed at or before `t` (a death that set something off, not one it caused). */
const fatalBy = (p: PlayerInfo, t: number) =>
  p.damageTaken.some((e) => e.healthAfter === 0 && (e.amount ?? 0) > 0 && e.timestamp <= t + 50 && t - e.timestamp <= 1500);
const pct = (c?: EnemyEvent) => (c?.hitPoints !== undefined && c.maxHitPoints ? (100 * c.hitPoints) / c.maxHitPoints : undefined);
const clockOf = (ms: number) => `${Math.floor(ms / 60_000)}:${String(Math.floor((ms % 60_000) / 1000)).padStart(2, "0")}`;

/** A Spell-in-Waiting status: who holds it and when it resolves. */
type Waiting = { p: PlayerInfo; due: number };
function waitingOf(players: PlayerInfo[], id: number, from: number, to: number): Waiting[] {
  const out: Waiting[] = [];
  for (const p of players) {
    const e = appliedIn(p, id, from, to);
    if (e?.durationMs) out.push({ p, due: e.timestamp + e.durationMs });
  }
  return out;
}

// ── Shiva-as-dragon's autos, Akh Rhai ───────────────────────────────────────

/**
 * After Drachen Armor, Shiva auto-attacks her two highest-enmity players
 * (40177 the first, 40178 the second), at +15/+18/+21 and +56. Every clean
 * swing landed on the two tanks; V22 and W4 hit a DPS three times running,
 * one died each time. The tank who took neither swing wasn't holding second
 * place on Shiva's enmity: they are named. Exposure: the tanks.
 */
function detectAutos(players: PlayerInfo[], life: Life, start: number, end: number, occurrences?: ReportedOccurrence[]): PullError[] {
  const errors: PullError[] = [];
  const tanks = players.filter(isTank);
  for (const swing of clusterByGap(hitsIn(players, life, [AUTO_FIRST, AUTO_SECOND], start, end), (h) => h.e.timestamp, 10_000)) {
    const t = swing[0].e.timestamp;
    occurrences?.push({ mechanicKey: ETD_AUTOS_RULE_ID, timestamp: t, players: tanks.map((p) => p.name) });
    const off = swing.filter((h) => !isTank(h.p));
    const live = tanks.filter((p) => life.alive(p, t - 500));
    const idle = live.filter((p) => !swing.some((h) => h.p === p));
    if (!off.length || live.length < 2 || idle.length !== 1) continue;
    const killed = diedIn(life, off);
    errors.push(playerError(idle[0], {
      ruleId: ETD_AUTOS_RULE_ID, severity: killed.length ? "Major" : "Minor", name: "Lost Second Place on Enmity",
      description: `Shiva's second auto-attack went to ${namesOf(playersOf(off))} instead (${off.length} swing${off.length > 1 ? "s" : ""}, ${sumOf(off.map((h) => h.e))})${killed.length ? ` and killed ${namesOf(killed)}` : ""}: ${idle[0].name} wasn't second on her enmity. Once she takes her dragon form she auto-attacks her two highest-enmity players, so the off-tank keeps tank stance on her.`,
      timestamp: t, abilityId: off[0].e.abilityId, abilityName: "Attack",
    }));
  }
  return errors;
}

/**
 * Akh Rhai's puddles pulse under where everyone stood: every hit is a Damage
 * Down. GROUP_HIT or more hit at once is the group not moving at all (Z10:
 * all eight, 3-7 pulses each, all died): one player-less error.
 */
function detectAkhRhai(players: PlayerInfo[], life: Life, start: number, end: number): PullError[] {
  const errors: PullError[] = [];
  const hits = hitsIn(players, life, AKH_RHAI, start, end);
  if (playersOf(hits).length >= GROUP_HIT) {
    const killed = diedIn(life, hits);
    return [playerlessMinor(ETD_AKH_RHAI_RULE_ID, "Group in Akh Rhai",
      `${playersOf(hits).length} players stayed in their Akh Rhai puddles (${namesOf(playersOf(hits))}), all with Damage Down${killed.length ? `; ${namesOf(killed)} died` : ""}. Akh Rhai drops a puddle under everyone as the wings sprout, then pulses ten times: everyone steps out once.`,
      hits[0].e.timestamp, AKH_RHAI, "Akh Rhai")];
  }
  for (const [p, es] of byPlayer(hits)) {
    for (const g of clusterByGap(es, (e) => e.timestamp, EPISODE_MS)) {
      const death = life.diedFrom(p, g[g.length - 1].timestamp);
      errors.push(playerError(p, {
        ruleId: ETD_AKH_RHAI_RULE_ID, severity: "Major", name: "Hit by Akh Rhai",
        description: `Stayed in Akh Rhai's puddle (${g.length} hit${g.length > 1 ? "s" : ""}, ${sumOf(g)}): Damage Down${death ? ", and died" : ""}. Akh Rhai drops a puddle under everyone as the wings sprout, then pulses ten times: step out once, toward your lineup spot.`,
        timestamp: g[0].timestamp, abilityId: AKH_RHAI, abilityName: "Akh Rhai",
      }));
    }
  }
  return errors;
}

// ── Darklit Dragonsong ──────────────────────────────────────────────────────

type Darklit = { t: number; chained: PlayerInfo[]; water: Waiting[] };

function darklitOf(players: PlayerInfo[], casts: EnemyEvent[], start: number, end: number): Darklit | undefined {
  const cast = castsOf(casts, DARKLIT, end).find((c) => c.timestamp >= start);
  if (!cast) return undefined;
  const t = cast.timestamp;
  return {
    t,
    chained: players.filter((p) => appliedIn(p, REFULGENT_CHAIN, t, t + 3000)),
    water: waitingOf(players, W_WATER, t - 500, t + 3000),
  };
}

/**
 * Everyone starts Darklit with three Lightsteeped; the four chained players
 * take the two towers (+1), the four others bait one Path of Light cone each
 * (+1). A fifth stack explodes as Lightsteep, which killed the raid every
 * time (B9, D5, F11). With all eight alive, every player who reached five is
 * named, with what gave it: a chained player in a cone (D5, F11), or two
 * cones on one player (B9). With someone dead the cones retarget (X5, X8).
 */
function detectLightsteep(players: PlayerInfo[], life: Life, casts: EnemyEvent[], dl: Darklit, end: number): PullError[] {
  const errors: PullError[] = [];
  const to = Math.min(end, dl.t + 20_000);
  const fifth = players
    .map((p) => ({ p, e: p.debuffs.find((e) => e.abilityId === LIGHTSTEEPED && (e.stack ?? 0) >= 5 && e.timestamp >= dl.t && e.timestamp <= to) }))
    .filter((x): x is { p: PlayerInfo; e: PlayerEvent } => !!x.e);
  const blast = hitsIn(players, life, LIGHTSTEEP, dl.t, to);
  const killed = diedIn(life, blast);
  if (fifth.length && allAlive(players, life, fifth[0].e.timestamp - 1500)) {
    for (const { p, e } of fifth) {
      const towers = p.damageTaken.filter((x) => x.abilityId === BRIGHT_HUNGER && x.timestamp >= dl.t && x.timestamp <= e.timestamp + 1000).length;
      const cones = p.damageTaken.filter((x) => x.abilityId === PATH_OF_LIGHT && x.timestamp >= dl.t && x.timestamp <= e.timestamp + 1000);
      const aimed = uniq(cones.map((x) => castsOf(casts, PATH_OF_LIGHT, to).find((c) => c.sourceInstance === x.sourceInstance && Math.abs(c.timestamp - x.timestamp) < 1500)?.target).filter((n): n is string => !!n && n !== p.name));
      const chained = dl.chained.includes(p);
      const what = chained
        ? `held a Refulgent Chain (a tower soaker)${towers ? " and soaked a tower" : ""}, but also stood in ${cones.length > 1 ? `${cones.length} Path of Light cones` : "a Path of Light cone"}${aimed.length ? ` aimed at ${joinNames(aimed)}` : ""}`
        : `took ${cones.length > 1 ? `${cones.length} Path of Light cones` : "a Path of Light cone"}${towers ? ` and ${towers > 1 ? `${towers} tower soaks` : "a tower soak"}` : ""}${aimed.length ? ` (aimed at ${joinNames(aimed)} too)` : ""}`;
      errors.push(playerError(p, {
        ruleId: ETD_LIGHTSTEEP_RULE_ID, severity: "Major", name: "Fifth Lightsteeped",
        description: `Reached five Lightsteeped: ${what}. Five explodes as Lightsteep on everyone${killed.length ? ` (${namesOf(killed)} died)` : ""}. Everyone starts with three: the four chained players take one tower each pair, the other four bait one cone each, nobody takes both.`,
        timestamp: e.timestamp, abilityId: LIGHTSTEEP, abilityName: "Lightsteep",
      }));
    }
  }
  if (killed.length >= COLLAPSE_DEAD_COUNT) {
    errors.push(raidMarker(ETD_LIGHTSTEEP_RULE_ID, "Lightsteep",
      `A fifth Lightsteeped stack exploded and killed ${namesOf(killed)}: unrecoverable from here.`,
      blast[0].e.timestamp, LIGHTSTEEP, "Lightsteep"));
  }
  return errors;
}

/**
 * Refulgent Chain turns into Refulgent Fate 7s in; a pair too close or too
 * far apart at that moment, or later, breaks and explodes as Refulgent Fate
 * on everyone (Damage Down). A death breaks it too: the holder's fatal hit
 * landed at or before their chain ended (V22/W4/W8 at Darklit's raidwide,
 * B9 to Lightsteep, B6/D8 to doubled Water), and that is fallout. Otherwise
 * the holder whose status ended first broke it (C10 +33.6: one endpoint
 * 0.2s after the chain activated, everyone died).
 */
function detectChains(players: PlayerInfo[], life: Life, casts: EnemyEvent[], dl: Darklit, end: number): PullError[] {
  const errors: PullError[] = [];
  const holders = players.filter((p) => appliedIn(p, REFULGENT_CHAIN, dl.t, dl.t + 3000) || appliedIn(p, FATE_STATUS, dl.t, dl.t + 12_000));
  const explosions = castsOf(casts, REFULGENT_FATE, end).filter((c) => c.timestamp >= dl.t && c.timestamp <= dl.t + 25_000);
  for (const blast of clusterByGap(explosions, (c) => c.timestamp, 1500)) {
    const t = blast[0].timestamp;
    // The Chain's own removal is its activation (Fate applied the same
    // millisecond), not a break.
    const broken = (p: PlayerInfo, e: PlayerEvent) => e.debuffStatus === "removed" && e.timestamp >= t - 1500 && e.timestamp <= t + 100 &&
      (e.abilityId === FATE_STATUS || (e.abilityId === REFULGENT_CHAIN && !appliedIn(p, FATE_STATUS, e.timestamp - 300, e.timestamp + 300)));
    const ends = holders
      .map((p) => ({ p, e: p.debuffs.find((e) => broken(p, e)) }))
      .filter((x): x is { p: PlayerInfo; e: PlayerEvent } => !!x.e);
    if (!ends.length) continue;
    const first = Math.min(...ends.map((x) => x.e.timestamp));
    const broke = ends.filter((x) => x.e.timestamp - first <= 100).map((x) => x.p);
    if (broke.some((p) => fatalBy(p, first))) continue;
    const hit = playersOf(hitsIn(players, life, REFULGENT_FATE, t - 200, t + 2000));
    const killed = uniq(hitsIn(players, life, REFULGENT_FATE, t - 200, t + 2000).filter((h) => life.diedFrom(h.p, h.e.timestamp)).map((h) => h.p));
    // Knocked by a shared Spirit Taker just before: the Spirit Taker error
    // is the cause (user, 2026-10-12, j6Zhc8 14 +43.4: the NIN didn't go to
    // their spread spot; the SGE's chain broke from the knock).
    const knocked = (p: PlayerInfo) => p.damageTaken.some((e) => e.abilityId === SPIRIT_TAKER && e.timestamp <= first && first - e.timestamp <= KNOCKED_CHAIN_MS &&
      players.filter((q) => q !== p && q.damageTaken.some((x) => x.abilityId === SPIRIT_TAKER && Math.abs(x.timestamp - e.timestamp) <= 500)).length > 0);
    for (const p of broke) {
      if (knocked(p)) continue;
      errors.push(playerError(p, {
        ruleId: ETD_CHAIN_RULE_ID, severity: "Major", name: "Refulgent Chain Broke",
        description: `Their end of the Refulgent Chain broke ${Math.round((first - dl.t) / 100) / 10}s into Darklit, and Refulgent Fate exploded on ${hit.length} players with Damage Down${killed.length ? `; ${namesOf(killed)} died` : ""}. Unlike Phase 2, the chain breaks when its two ends are too close as well as too far: hold the bowtie spots with your partner.`,
        timestamp: first, abilityId: REFULGENT_FATE, abilityName: "Refulgent Fate",
      }));
    }
    if (killed.length >= COLLAPSE_DEAD_COUNT) {
      errors.push(raidMarker(ETD_CHAIN_RULE_ID, "Refulgent Fate",
        `A broken Refulgent Chain exploded and killed ${namesOf(killed)}: unrecoverable from here.`, t, REFULGENT_FATE, "Refulgent Fate"));
    }
  }
  return errors;
}

/**
 * Darklit's two Dark Water III stacks need four each (fewer gave Mark of
 * Mortality); with all eight alive:
 * - both Waters on one group (B6/D8 +45: five took both and died): both
 *   holders are named; one of the unchained players on that side had to
 *   swap with the other side.
 * - a player in neither stack is named.
 */
function detectDarklitWater(players: PlayerInfo[], life: Life, dl: Darklit, end: number): PullError[] {
  const errors: PullError[] = [];
  if (dl.water.length !== 2) return errors;
  const t = Math.min(...dl.water.map((w) => w.due));
  if (t > end || !allAlive(players, life, t - 500)) return errors;
  const hits = hitsIn(players, life, DARK_WATER, t - 300, t + 1500);
  if (!hits.length) return errors;
  const stacks = [...instancesOf(hits).values()].map(playersOf);
  const mom = momIn(players, DARK_WATER, t + 700);
  const killed = diedIn(life, hits);
  const holders = dl.water.map((w) => w.p);
  const sev = mom.length || killed.length ? "Major" : "Minor";
  const outcome = `${mom.length ? ` ${namesOf(mom)} got Mark of Mortality.` : ""}${killed.length ? ` ${namesOf(killed)} died.` : ""}`;
  const why = "Darklit's two Dark Water III stacks take four each, one Water per side; when both Waters land on the same side, the unchained players on it swap vertically during the cones.";
  const err = (p: PlayerInfo, name: string, text: string) =>
    errors.push(playerError(p, { ruleId: ETD_WATER_RULE_ID, severity: sev, name, description: `${text}${outcome} ${why}`, timestamp: t, abilityId: DARK_WATER, abilityName: "Dark Water III" }));
  const both = players.filter((p) => stacks.filter((s) => s.includes(p)).length > 1);
  if (both.length >= 3) {
    for (const h of holders) err(h, "Water Holders Together", `Held a Dark Water III on the same side as ${namesOf(holders.filter((x) => x !== h))}, who held the other: both Waters hit ${namesOf(both)}.`);
    return errors;
  }
  const soaked = uniq(stacks.flat());
  const short = stacks.filter((s) => s.length < WATER_MIN);
  const missing = players.filter((x) => !soaked.includes(x));
  // A Water that hit only its holder while the missing players stood
  // together away from them: the holder didn't reach their stack spot
  // (user, 2026-10-12, j6Zhc8 6 +44.7: the PCT didn't make it across; the
  // three missing stood within 1.6y of each other, 5.4y from the PCT). The
  // only lone-holder Water on disk.
  const lone = stacks.filter((s) => s.length === 1 && holders.includes(s[0])).map((s) => s[0]);
  if (lone.length === 1 && missing.length >= 2) {
    const at = (p: PlayerInfo) => interpolatePlayerPosition(p, t - 300, { windowMs: 1500 });
    const ms = missing.map(at);
    if (ms.every(Boolean)) {
      const cx = ms.reduce((s, q) => s + q!.x, 0) / ms.length, cy = ms.reduce((s, q) => s + q!.y, 0) / ms.length;
      const spread = Math.max(...ms.map((q) => Math.hypot(q!.x - cx, q!.y - cy))) / 100;
      const h = at(lone[0]);
      const away = h ? Math.hypot(h.x - cx, h.y - cy) / 100 : 0;
      if (spread <= LONE_WATER_GROUP_YD && away >= LONE_WATER_AWAY_YD) {
        err(lone[0], "Late to the Water Stack", `Held a Dark Water III but stood ~${away.toFixed(1)} yalms from ${namesOf(missing)}, who were waiting together for it, so it hit only them.`);
        return errors;
      }
    }
  }
  for (const p of missing) {
    err(p, "Missed Dark Water", `Wasn't in either Dark Water III stack${short.length ? `, so ${namesOf(short.flat())} took one short` : ""}.`);
  }
  for (const p of both) err(p, "Doubled Dark Water", "Stood in both Dark Water III stacks at once.");
  return errors;
}

/**
 * Spirit Taker jumps on a random player; anyone near them is hit and knocked
 * back (B10 +41.3: the second player died 2.7s later with no killing blow).
 * The cast keeps its target only when one player was hit, so everyone in a
 * shared one is named.
 */
function detectSpiritTaker(players: PlayerInfo[], life: Life, casts: EnemyEvent[], deaths: DeathEvent[], start: number, end: number): PullError[] {
  const errors: PullError[] = [];
  for (const res of clusterByGap(hitsIn(players, life, SPIRIT_TAKER, start, end), (h) => h.e.timestamp, 1500)) {
    const hit = playersOf(res);
    if (hit.length < 2) continue;
    const t = res[0].e.timestamp;
    const target = casts.find((c) => c.abilityId === SPIRIT_TAKER && c.target && c.timestamp >= t - 1500 && c.timestamp <= t + 100)?.target;
    const dead = hit.filter((p) => deaths.some((d) => d.player === p.name && d.timestamp >= t && d.timestamp - t <= KNOCK_MAX_MS + 1000));
    for (const p of target ? hit.filter((x) => x.name !== target) : hit) {
      errors.push(playerError(p, {
        ruleId: ETD_SPIRIT_RULE_ID, severity: dead.length ? "Major" : "Minor", name: "Shared Spirit Taker",
        description: `${target ? `Stood too close to ${target}, Spirit Taker's target` : `Shared a Spirit Taker with ${namesOf(hit.filter((x) => x !== p))}`}: hit and knocked back.${dead.length ? ` ${namesOf(dead)} died${!res.some((h) => life.diedFrom(h.p, h.e.timestamp)) ? " (knocked out of the arena)" : ""}.` : ""} Spirit Taker jumps on a random player: spread so it lands on one.`,
        timestamp: t, abilityId: SPIRIT_TAKER, abilityName: "Spirit Taker",
      }));
    }
  }
  return errors;
}

/** Darklit's Hallowed Wings cleaves half the room: anyone in that half is hit (G8 +46.5, died). */
function detectHalfWings(players: PlayerInfo[], life: Life, start: number, end: number): PullError[] {
  return hitsIn(players, life, HALF_WINGS, start, end).map((h) => {
    const death = life.diedFrom(h.p, h.e.timestamp);
    return playerError(h.p, {
      ruleId: ETD_WINGS_RULE_ID, severity: death ? "Major" : "Minor", name: "Hit by Hallowed Wings",
      description: `Was in the half of the room Hallowed Wings cleaved (${kFmt(realAmount(h.e))})${death ? " and died" : ""}. Shiva's wing covers half the arena: the Water stacks go to the safe side.`,
      timestamp: h.e.timestamp, abilityId: h.e.abilityId, abilityName: "Hallowed Wings",
    });
  });
}

/**
 * Somber Dance: Gaia jumps on the farthest player, then the nearest. In
 * every clear one tank took both under Living Dead. A non-tank hit stood
 * farther out than the tank (E3 +49.5, four hit, all died) or next to them
 * (B1/C3 +52.8). Fallout when no tank was alive. Exposure: the non-tanks.
 */
function detectBusters(players: PlayerInfo[], life: Life, start: number, end: number, occurrences?: ReportedOccurrence[]): PullError[] {
  const errors: PullError[] = [];
  const tanks = players.filter(isTank);
  for (const [id, why] of [
    [SOMBER_FAR, "the first Somber Dance jumps on the farthest player: the tank goes out to bait it and everyone else stays closer"],
    [SOMBER_NEAR, "the second Somber Dance jumps on the nearest player: the tank comes back in and everyone else stays away from them"],
  ] as [number, string][]) {
    for (const res of clusterByGap(hitsIn(players, life, id, start, end), (h) => h.e.timestamp, 1500)) {
      const t = res[0].e.timestamp;
      occurrences?.push({ mechanicKey: ETD_BUSTER_RULE_ID, timestamp: t, players: players.filter((p) => !isTank(p)).map((p) => p.name) });
      if (!tanks.some((p) => life.alive(p, t - 500))) continue;
      for (const h of res.filter((x) => !isTank(x.p))) {
        const death = life.diedFrom(h.p, h.e.timestamp);
        errors.push(playerError(h.p, {
          ruleId: ETD_BUSTER_RULE_ID, severity: death ? "Major" : "Minor", name: "Hit by Somber Dance",
          description: `Was hit by Somber Dance (${kFmt(realAmount(h.e))})${death ? " and died" : ""}${res.length > 1 ? ` with ${namesOf(playersOf(res).filter((x) => x !== h.p))}` : ""}: ${why}.`,
          timestamp: t, abilityId: id, abilityName: "Somber Dance",
        }));
      }
    }
  }
  return errors;
}

// ── Akh Morn and Morn Afah ──────────────────────────────────────────────────

/**
 * Akh Morn: each boss fires four volleys at her top-enmity player and
 * whoever stands with them. Clean (every clear): one tank solo on one boss,
 * the other seven on the other, the solo swapping between the two Akh Morns.
 * A player hit by both bosses in one volley is the failure:
 * - with both tanks alive, both bosses targeted the same player: enmity.
 *   The tank both targeted is named alone when they Provoked a boss earlier
 *   in Phase 4 that the other tank didn't take back (C5: the Gaia tank
 *   Provoked Shiva); otherwise both tanks (G8).
 * - a solo tank who died to it is named (B1, B10); the group then took both
 *   bosses' volleys, which is fallout.
 * Four or more killed by Akh Morn is a Raid. Exposure: the tanks.
 */
function detectAkhMorn(players: PlayerInfo[], life: Life, casts: EnemyEvent[], deaths: DeathEvent[], start: number, end: number, occurrences?: ReportedOccurrence[]): PullError[] {
  const errors: PullError[] = [];
  const tanks = players.filter(isTank);
  for (const st of castsOf(casts, AKH_MORN_START, end).filter((c) => c.timestamp >= start)) {
    const t0 = st.timestamp;
    occurrences?.push({ mechanicKey: ETD_AKH_MORN_RULE_ID, timestamp: t0, players: tanks.map((p) => p.name) });
    const volleys = clusterByGap(castsOf(casts, [AKH_MORN_SHIVA, AKH_MORN_GAIA], end).filter((c) => c.timestamp > t0 && c.timestamp - t0 < 6000), (c) => c.timestamp, 300);
    const all = hitsIn(players, life, [AKH_MORN_SHIVA, AKH_MORN_GAIA], t0, t0 + 7000);
    const killed = uniq(deaths.filter((d) => d.timestamp >= t0 && d.timestamp - t0 <= 10_000 && (d.killingAbilityGameId === AKH_MORN_SHIVA || d.killingAbilityGameId === AKH_MORN_GAIA))
      .map((d) => players.find((p) => p.name === d.player)).filter((p): p is PlayerInfo => !!p));
    if (!all.length || tanks.length < 2 || !tanks.every((p) => life.alive(p, t0))) continue;
    let flagged = false;
    let soloDied: PlayerInfo | undefined;
    for (const v of volleys) {
      const t = v[0].timestamp;
      const S = playersOf(all.filter((h) => h.e.abilityId === AKH_MORN_SHIVA && h.e.timestamp >= t && h.e.timestamp - t < 1000));
      const G = playersOf(all.filter((h) => h.e.abilityId === AKH_MORN_GAIA && h.e.timestamp >= t && h.e.timestamp - t < 1000));
      const solo = S.length === 1 ? S[0] : G.length === 1 ? G[0] : undefined;
      if (solo && killed.includes(solo) && !soloDied && isTank(solo) && !S.some((p) => G.includes(p))) {
        soloDied = solo;
        errors.push(playerError(solo, {
          ruleId: ETD_AKH_MORN_RULE_ID, severity: "Major", name: "Died Tanking Akh Morn Alone",
          description: `Took ${S.length === 1 ? "Shiva's" : "Gaia's"} Akh Morn volleys alone and died before the last one; the next volley then landed on the group along with the other boss's. The solo tank needs heavy mitigation: these hits go through invulnerabilities.`,
          timestamp: t, abilityId: S.length === 1 ? AKH_MORN_SHIVA : AKH_MORN_GAIA, abilityName: "Akh Morn",
        }));
      }
      const both = S.filter((p) => G.includes(p));
      if (!both.length || soloDied || !tanks.every((p) => life.alive(p, t - 300))) continue;
      const target = both.length === 1 && isTank(both[0]) ? both[0] : undefined;
      const other = target ? tanks.find((p) => p !== target) : undefined;
      // The tank both bosses targeted Provoked the boss the other tank had
      // last Provoked (C5: both on Shiva), and the other didn't take it back.
      const provoked = target && other ? lastProvoke(target, start, t0) : undefined;
      const stolen = !!provoked && !!other && lastProvoke(other, -Infinity, provoked.timestamp)?.target === provoked.target &&
        !other.casts.some((c) => c.abilityName === PROVOKE && c.target === provoked.target && c.timestamp > provoked.timestamp && c.timestamp < t0);
      const retaken = !stolen;
      const named = stolen ? [target!] : tanks;
      for (const p of named) {
        errors.push(playerError(p, {
          ruleId: ETD_AKH_MORN_RULE_ID, severity: killed.length ? "Major" : "Minor", name: "Both Akh Morns on One Target",
          description: `Both bosses' Akh Morn volleys landed on ${target ? target.name : namesOf(both)}${provoked && !retaken ? `: ${p.name} Provoked ${provoked.target} at ${clockOf(provoked.timestamp)}, taking the boss the other tank should hold` : `: the tanks didn't each hold top enmity on one boss (${namesOf(tanks)})`}.${killed.length ? ` ${namesOf(killed)} died to Akh Morn.` : ""} Each boss aims at her own top-enmity player: one tank per boss, and a hit from both stacks a lethal Design penalty.`,
          timestamp: t, abilityId: AKH_MORN_SHIVA, abilityName: "Akh Morn",
        }));
      }
      flagged = true;
      break;
    }
    if (killed.length >= COLLAPSE_DEAD_COUNT && (flagged || soloDied)) {
      errors.push(raidMarker(ETD_AKH_MORN_RULE_ID, "Akh Morn",
        `Both bosses' Akh Morns landed on the group and killed ${namesOf(killed)}: unrecoverable from here.`,
        Math.max(t0, ...errors.filter((e) => e.ruleId === ETD_AKH_MORN_RULE_ID && e.timestamp >= t0).map((e) => e.timestamp)), AKH_MORN_SHIVA, "Akh Morn"));
    }
  }
  return errors;
}

/** The tank's last Provoke on a boss in Phase 4 before `t`. */
function lastProvoke(p: PlayerInfo, from: number, t: number) {
  return p.casts.filter((c) => c.abilityName === PROVOKE && c.target && c.timestamp >= from && c.timestamp < t && (c.target === SHIVA_NAME || c.target === GAIA_NAME)).pop();
}

/**
 * Morn Afah is a stack on Shiva's top-enmity player, lethal when the two
 * bosses' HP differ by more than 5 points (gap at the cast: 4.8 survived,
 * 6.0 killed seven). With the gap over 5, the static's tank took it alone
 * and died instead (E1/E5/E8/B10, 10.9-18.3 points): a player-less note on
 * the HP balance. A player who took it alone and died with the gap under 5
 * is named (A4/G1 +154, B1 +71.7: the stack would have shared it). Four or
 * more killed is a Raid.
 */
function detectAfah(players: PlayerInfo[], life: Life, casts: EnemyEvent[], start: number, end: number): PullError[] {
  const errors: PullError[] = [];
  for (const g of castsOf(casts, AFAH_GAIA, end).filter((c) => c.timestamp >= start)) {
    const s = casts.find((c) => c.abilityId === AFAH_SHIVA && Math.abs(c.timestamp - g.timestamp) < 1000);
    const gp = pct(g), sp = pct(s);
    const gap = gp !== undefined && sp !== undefined ? Math.abs(gp - sp) : undefined;
    const hits = hitsIn(players, life, MORN_AFAH, g.timestamp, g.timestamp + 4000);
    if (!hits.length) continue;
    const hit = playersOf(hits);
    const killed = diedIn(life, hits);
    const alive = players.filter((p) => life.alive(p, g.timestamp));
    const hp = gap === undefined ? "" : `Gaia ${gp!.toFixed(1)}% and Shiva ${sp!.toFixed(1)}%, a ${gap.toFixed(1)}-point gap`;
    const t = hits[0].e.timestamp;
    if (hit.length === 1 && alive.length >= 4) {
      const p = hit[0];
      if (gap !== undefined && gap > AFAH_GAP_PCT) {
        errors.push(playerlessMinor(ETD_AFAH_RULE_ID, "Morn Afah HP Imbalance",
          `The bosses were at ${hp} when Morn Afah went off, over the 5 points the stack survives, and ${p.name} took it alone${killed.includes(p) ? " and died" : ""}. Spread damage so Shiva and Gaia are within 5% at each Morn Afah.`,
          t, MORN_AFAH, "Morn Afah"));
      } else if (killed.includes(p)) {
        errors.push(playerError(p, {
          ruleId: ETD_AFAH_RULE_ID, severity: "Major", name: "Took Morn Afah Alone",
          description: `Took Morn Afah alone and died (${kFmt(realAmount(hits[0].e))})${hp ? `; the bosses were at ${hp}, so the full stack would have shared it` : ""}. Morn Afah targets Shiva's top-enmity player: everyone stacks on them.`,
          timestamp: t, abilityId: MORN_AFAH, abilityName: "Morn Afah",
        }));
      }
      continue;
    }
    if (killed.length >= COLLAPSE_DEAD_COUNT) {
      errors.push(raidMarker(ETD_AFAH_RULE_ID, "Morn Afah",
        `Morn Afah killed ${namesOf(killed)}${hp ? ` with the bosses at ${hp}` : ""}${gap !== undefined && gap > AFAH_GAP_PCT ? ", over the 5 points the stack survives" : `; only ${hit.length} were in the stack to share it`}. Unrecoverable from here.`,
        t, MORN_AFAH, "Morn Afah"));
    }
  }
  return errors;
}

// ── Crystallize Time ────────────────────────────────────────────────────────

type Ct = {
  t: number;
  claws: { p: PlayerInfo; due: number }[];
  fangs: { p: PlayerInfo; due: number }[];
  spell: Map<PlayerInfo, { id: number; due: number }>;
};

function ctOf(players: PlayerInfo[], casts: EnemyEvent[], start: number, end: number): Ct | undefined {
  const cast = castsOf(casts, CRYSTALLIZE, end).find((c) => c.timestamp >= start);
  if (!cast) return undefined;
  const t = cast.timestamp;
  const ct: Ct = { t, claws: [], fangs: [], spell: new Map() };
  for (const p of players) {
    const claw = appliedIn(p, WYRMCLAW, t, t + 3000), fang = appliedIn(p, WYRMFANG, t, t + 3000);
    if (claw?.durationMs) ct.claws.push({ p, due: claw.timestamp + claw.durationMs });
    if (fang?.durationMs) ct.fangs.push({ p, due: fang.timestamp + fang.durationMs });
    for (const id of [W_WATER, W_BLIZZARD, W_ERUPTION, W_UNHOLY, W_AERO]) {
      const e = appliedIn(p, id, t, t + 3000);
      if (e?.durationMs) ct.spell.set(p, { id, due: e.timestamp + e.durationMs });
    }
  }
  return ct;
}
const holdersOf = (ct: Ct, id: number) => [...ct.spell].filter(([, s]) => s.id === id).map(([p]) => p);
const blues = (ct: Ct) => ct.fangs.map((f) => f.p);
const redsWith = (ct: Ct, id: number) => ct.claws.map((c) => c.p).filter((p) => ct.spell.get(p)?.id === id);

/**
 * Crystallize Time's first stacks, identical in all 21 resolutions with
 * everyone alive: the Water takes the blue Water, blue Blizzard and blue
 * Unholy players plus one Aero (red) player; Unholy Darkness takes all four
 * blue players plus one Ice (red) player. Under four / five gives Mark of
 * Mortality, which killed at the next hit. With all eight alive a missing
 * blue player is named; with no red of the right kind in it, both are
 * (either could have joined).
 */
function detectCtStacks(players: PlayerInfo[], life: Life, ct: Ct, end: number): PullError[] {
  const errors: PullError[] = [];
  for (const [id, wid, kind, redId, need, name, why] of [
    [DARK_WATER, W_WATER, "Aero", W_AERO, WATER_MIN, "Dark Water III",
      "The Water takes the blue Water, Blizzard and Unholy players and one Aero player, on the south side."],
    [UNHOLY, W_UNHOLY, "Ice", W_BLIZZARD, UNHOLY_MIN, "Unholy Darkness",
      "Unholy Darkness takes all four blue players and one Ice player after the knockback."],
  ] as [number, number, string, number, number, string, string][]) {
    const holder = holdersOf(ct, wid).find((p) => blues(ct).includes(p));
    const due = holder ? ct.spell.get(holder)!.due : undefined;
    if (due === undefined || due > end || !allAlive(players, life, due - 500)) continue;
    const hits = hitsIn(players, life, id, due - 300, due + 1500);
    if (!hits.length) continue;
    const soaked = playersOf(hits);
    const expected = blues(ct).filter((p) => id === UNHOLY || ct.spell.get(p)?.id !== W_ERUPTION);
    const reds = redsWith(ct, redId);
    const mom = momIn(players, id, due + 700);
    const killed = diedIn(life, hits);
    const short = soaked.length < need;
    const sev = short || mom.length || killed.length ? "Major" : "Minor";
    const outcome = `${soaked.length} took it${short ? `, under the ${need} it needs` : ""}.${mom.length ? ` ${namesOf(mom)} got Mark of Mortality.` : ""}${killed.length ? ` ${namesOf(killed)} died.` : ""}`;
    for (const p of expected.filter((x) => !soaked.includes(x))) {
      errors.push(playerError(p, {
        ruleId: ETD_UNHOLY_RULE_ID, severity: sev, name: `Missed ${name}`,
        description: `Wasn't in ${holder!.name}'s ${name} stack; ${outcome} ${why}`,
        timestamp: due, abilityId: id, abilityName: name,
      }));
    }
    if (reds.length && !reds.some((p) => soaked.includes(p))) {
      for (const p of reds) {
        errors.push(playerError(p, {
          ruleId: ETD_UNHOLY_RULE_ID, severity: sev, name: `No ${kind} Player in ${name}`,
          description: `Neither ${kind} player (${namesOf(reds)}) joined ${holder!.name}'s ${name} stack; ${outcome} ${why}`,
          timestamp: due, abilityId: id, abilityName: name,
        }));
      }
    }
  }
  return errors;
}

/**
 * Dark Aero III: two red players each knock back their surroundings. One
 * takes the party's knockback inside the blue donut, the other resolves
 * alone. Players hit by both (C6/E8 +102: they died) mean the two Aero
 * holders stood together: both are named, unless one was already dead.
 */
function detectAero(players: PlayerInfo[], life: Life, ct: Ct, end: number): PullError[] {
  const errors: PullError[] = [];
  const holders = holdersOf(ct, W_AERO);
  const due = holders.length ? ct.spell.get(holders[0])!.due : undefined;
  if (due === undefined || due > end || holders.length !== 2 || !holders.every((p) => life.alive(p, due - 500))) return errors;
  const hits = hitsIn(players, life, DARK_AERO, due - 300, due + 1500);
  const inst = [...instancesOf(hits).values()];
  if (inst.length < 2) return errors;
  const both = players.filter((p) => inst.filter((hs) => hs.some((h) => h.p === p)).length > 1);
  if (!both.length) return errors;
  const killed = diedIn(life, hits);
  for (const p of holders) {
    errors.push(playerError(p, {
      ruleId: ETD_AERO_RULE_ID, severity: killed.length ? "Major" : "Minor", name: "Dark Aero III Holders Together",
      description: `Held a Dark Aero III and resolved it next to ${namesOf(holders.filter((x) => x !== p))}, who held the other: both hit ${namesOf(both)}.${killed.length ? ` ${namesOf(killed)} died.` : ""} One Aero holder knocks the party across inside the blue donut; the other resolves alone on the opposite side.`,
      timestamp: due, abilityId: DARK_AERO, abilityName: "Dark Aero III",
    }));
  }
  return errors;
}

/**
 * Plain avoidable hits in Crystallize Time, each a Damage Down: Dark
 * Blizzard III's donuts (C3 +102.8), Maelstrom (the hourglasses' circles,
 * A5 and B5 included) and Tidal Light's waves (A4 and A10, both clears).
 */
function detectCtAvoidables(players: PlayerInfo[], life: Life, ct: Ct, end: number): PullError[] {
  const errors: PullError[] = [];
  for (const [ids, ruleId, name, why] of [
    [[DARK_BLIZZARD], ETD_BLIZZARD_RULE_ID, "Dark Blizzard III", "The Ice players' Dark Blizzard III is a donut around each of them: stand inside it or well clear."],
    [[MAELSTROM], ETD_AVOIDABLE_RULE_ID, "Maelstrom", "Each Sorrow's Hourglass covers a circle with Maelstrom when it resolves: fast ones first, slow ones last."],
    [TIDAL_LIGHT, ETD_AVOIDABLE_RULE_ID, "Tidal Light", "Tidal Light sends four waves along one axis then the other: step into the strip a wave has already passed."],
  ] as [number[], string, string, string][]) {
    for (const [p, es] of byPlayer(hitsIn(players, life, ids, ct.t, end))) {
      for (const g of clusterByGap(es, (e) => e.timestamp, EPISODE_MS)) {
        const death = life.diedFrom(p, g[g.length - 1].timestamp);
        errors.push(playerError(p, {
          ruleId, severity: "Major", name: `Hit by ${name}`,
          description: `Hit by ${name} (${g.length > 1 ? `${g.length} hits, ` : ""}${sumOf(g)}): Damage Down${death ? ", and died" : ""}. ${why}`,
          timestamp: g[0].timestamp, abilityId: g[0].abilityId, abilityName: name,
        }));
      }
    }
  }
  return errors;
}

/**
 * Longing of the Lost: a red player meeting a dragon head pops it (their
 * Wyrmclaw ends at that millisecond, hitting them alone in every clean pop).
 * Anyone else in the blast is named: with the red's name when one popped it,
 * otherwise as having met a head with no Wyrmclaw (E8 +110.2, E12 +119.2).
 */
function detectLonging(players: PlayerInfo[], life: Life, ct: Ct, end: number): PullError[] {
  const errors: PullError[] = [];
  const popped = (h: Hit) => !!removedNear(h.p, WYRMCLAW, h.e.timestamp, 300);
  for (const [, hs] of instancesOf(hitsIn(players, life, LONGING, ct.t, end))) {
    for (const res of clusterByGap(hs, (h) => h.e.timestamp, 1000)) {
      const owners = playersOf(res.filter(popped));
      const caught = playersOf(res).filter((p) => !owners.includes(p));
      for (const p of caught) {
        const h = res.find((x) => x.p === p)!;
        const death = life.diedFrom(p, h.e.timestamp);
        errors.push(playerError(p, {
          ruleId: ETD_LONGING_RULE_ID, severity: death ? "Major" : "Minor", name: "Hit by Longing of the Lost",
          description: owners.length
            ? `Was caught in Longing of the Lost as ${namesOf(owners)} popped a dragon head (${kFmt(realAmount(h.e))})${death ? " and died" : ""}. A popped head explodes around the red player: keep clear of their intercept spot.`
            : `Met a dragon head without a Wyrmclaw: its Longing of the Lost hit them (${kFmt(realAmount(h.e))})${death ? " and killed them" : ""}. Only red players pop the heads; everyone else stays out of their path.`,
          timestamp: h.e.timestamp, abilityId: LONGING, abilityName: "Longing of the Lost",
        }));
      }
    }
  }
  return errors;
}

/**
 * Wyrmclaw (red) and Wyrmfang (blue) kill their holder when they run out:
 * a removal at the full duration, a no-killing-blow death 2s later (A1,
 * C2, E12, G10 twice, G11, B5 fangs; C9 a claw). Every clean claw ended at
 * its Longing of the Lost; every clean fang 23-36s in, at a beacon. A fang
 * that ran out after a red never popped (fewer than four heads popped) is
 * player-less: its beacon was never made.
 */
function detectWyrmExpiry(ct: Ct, deaths: DeathEvent[], end: number): PullError[] {
  const errors: PullError[] = [];
  const beacons = ct.claws.filter(({ p }) => p.debuffs.some((e) => e.abilityId === WYRMCLAW && e.debuffStatus === "removed" && e.timestamp > ct.t &&
    p.damageTaken.some((x) => x.abilityId === LONGING && Math.abs(x.timestamp - e.timestamp) <= 300))).length;
  for (const [list, id, name] of [[ct.claws, WYRMCLAW, "Wyrmclaw"], [ct.fangs, WYRMFANG, "Wyrmfang"]] as [{ p: PlayerInfo; due: number }[], number, string][]) {
    for (const { p, due } of list) {
      if (due > end) continue;
      const rem = removedNear(p, id, due, 600);
      const death = rem && deaths.find((d) => d.player === p.name && d.timestamp >= rem.timestamp && d.timestamp - rem.timestamp <= DEATH_EVENT_LAG_MS + 1500);
      if (!rem || !death) continue;
      if (id === WYRMFANG && beacons < ct.fangs.length) {
        errors.push(playerlessMinor(ETD_WYRM_RULE_ID, "Wyrmfang Ran Out",
          `${p.name}'s Wyrmfang ran out and killed them, but only ${beacons} of the four dragon-head pops happened, so there weren't enough beacons to cleanse every blue player.`,
          rem.timestamp, 0, name));
        continue;
      }
      errors.push(playerError(p, {
        ruleId: ETD_WYRM_RULE_ID, severity: "Major", name: `${name} Ran Out`,
        description: id === WYRMCLAW
          ? "Their Wyrmclaw ran out and killed them: they never met a dragon head. Each red player intercepts a head at their spot to pop it."
          : "Their Wyrmfang ran out and killed them: they never took a beacon. Each head a red player pops leaves one beacon, and each blue player takes one.",
        timestamp: rem.timestamp, abilityId: 0, abilityName: name,
      }));
    }
  }
  return errors;
}

/** Joyless Dragonsong: a dragon head finished its lap unpopped and hit the raid (only ever after four or more deaths here). */
function detectDragonLap(players: PlayerInfo[], life: Life, ct: Ct, end: number): PullError[] {
  const hits = hitsIn(players, life, JOYLESS, ct.t, end);
  if (!hits.length) return [];
  return [raidMarker(ETD_DRAGON_RULE_ID, "Dragon Head Finished Its Lap",
    `A dragon head finished its lap without being popped twice, and Joyless Dragonsong hit ${namesOf(playersOf(hits))}. The four red players pop the two heads before they come round: unrecoverable from here.`,
    hits[0].e.timestamp, JOYLESS, "Joyless Dragonsong")];
}

/**
 * The rewind's two Hallowed Wings hit everyone, hardest the four nearest
 * its origin, who get Magic Vulnerability Up for 6s. The tanks stand in
 * front for both (the same tank was in both front fours in A4/A5/A9/A10/
 * A11), so a non-tank in both took the second under the vulnerability.
 * Checked with all eight alive (a death shifts who is in front: A1).
 */
function detectRewindWings(players: PlayerInfo[], life: Life, ct: Ct, end: number): PullError[] {
  const errors: PullError[] = [];
  const waves = clusterByGap(hitsIn(players, life, REWIND_WINGS, ct.t, end), (h) => h.e.timestamp, 1500);
  if (waves.length < 2) return errors;
  // A wave's time is its median hit: a player nearest the origin can be hit
  // 1.4s before the rest (G13 +130.6 vs +132.0).
  const median = (w: Hit[]) => w.map((h) => h.e.timestamp).sort((a, b) => a - b)[Math.floor(w.length / 2)];
  const [t1, t2] = [median(waves[0]), median(waves[1])];
  if (!allAlive(players, life, t1 - 500)) return errors;
  const front = (t: number) => players.filter((p) => p.debuffs.some((e) => e.abilityId === MAGIC_VULN && e.debuffStatus === "applied" && Math.abs(e.timestamp - t) <= 400));
  const f2 = front(t2);
  for (const p of front(t1).filter((x) => f2.includes(x) && !isTank(x))) {
    const h = waves[1].find((x) => x.p === p);
    const death = h ? life.diedFrom(p, h.e.timestamp) : undefined;
    errors.push(playerError(p, {
      ruleId: ETD_REWIND_RULE_ID, severity: death ? "Major" : "Minor", name: "In Front for Both Wings",
      description: `Was among the four nearest both Hallowed Wings after the rewind: the first left them with Magic Vulnerability Up and the second hit them under it${h ? ` (${kFmt(realAmount(h.e))})` : ""}${death ? ", and they died" : ""}. The tanks lead both; for the second wing the other group is in front, so snapshot your Return at your group's corner.`,
      timestamp: t2, abilityId: REWIND_WINGS, abilityName: "Hallowed Wings",
    }));
  }
  return errors;
}

// ── the memory crystal ──────────────────────────────────────────────────────

/**
 * The crystal (actor "fragment of fate") takes scripted hits in every clear
 * (Darklit, the half-room wing, Crystallize Time, Maelstrom, Tidal Light,
 * three Quietus hits, both rewind wings). A player-owned attack landing on
 * it is the failure: Unholy Darkness (B5, F1, G14), Dark Eruption (C9, G11),
 * Longing of the Lost (E12, G11), Dark Aero III (E1). After Unholy or Longing
 * the crystal took no Quietus hit at all: shattered, and G14 went on to
 * Paradise Lost (the bad ending) at +195; after Eruption (C9) it still took
 * all three. The owner is named; a shattered crystal is a Raid.
 */
function detectCrystal(players: PlayerInfo[], casts: EnemyEvent[], ct: Ct | undefined, npcHits: NpcHit[], start: number, end: number): PullError[] {
  const errors: PullError[] = [];
  const onCrystal = npcHits.filter((h) => CRYSTAL_RE.test(h.targetName) && h.timestamp >= start && h.timestamp <= end);
  const owned: Record<number, string> = { [UNHOLY]: "Unholy Darkness", [DARK_ERUPTION]: "Dark Eruption", [LONGING]: "Longing of the Lost", [DARK_AERO]: "Dark Aero III" };
  const strikes = clusterByGap(onCrystal.filter((h) => owned[h.abilityId] !== undefined), (h) => h.timestamp, 1000).map((g) => g[0]);
  // The shattering strike: the last one before Quietus failed to reach the
  // crystal (G11: an Eruption at +102.9 it survived, a Longing at +119.5
  // that shattered it), or before Paradise Lost.
  const quietus = castsOf(casts, QUIETUS, end)[0];
  const quietusMissed = !!quietus && !onCrystal.some((x) => x.abilityId === QUIETUS && x.timestamp >= quietus.timestamp && x.timestamp - quietus.timestamp <= 3000);
  const lostBy = quietusMissed
    ? strikes.filter((h) => h.timestamp < quietus.timestamp + 1000).pop()
    : castsOf(casts, PARADISE_LOST, Infinity).length ? strikes[strikes.length - 1] : undefined;
  for (const h of strikes) {
    const what = owned[h.abilityId];
    const owners = ownersOf(players, casts, ct, h);
    const lost = h === lostBy;
    const text = `${what} hit the memory crystal${lost ? ", which shattered (it took no further hits)" : ""}. The crystal must survive Phase 4 for the good ending: resolve the elemental spells and pop the dragon heads well away from it, at the north.`;
    if (owners.length) {
      for (const p of owners) {
        errors.push(playerError(p, {
          ruleId: ETD_CRYSTAL_RULE_ID, severity: lost ? "Major" : "Minor", name: "Hit the Memory Crystal",
          description: `Their ${text}`, timestamp: h.timestamp, abilityId: h.abilityId, abilityName: what,
        }));
      }
    } else {
      errors.push(playerlessMinor(ETD_CRYSTAL_RULE_ID, "Memory Crystal Hit", text, h.timestamp, h.abilityId, what));
    }
    if (lost) {
      errors.push(raidMarker(ETD_CRYSTAL_RULE_ID, "Memory Crystal Shattered",
        `${what} shattered the memory crystal: the fight can't reach the good ending (Paradise Lost wipes the raid once Phase 4 ends). Treated as a cutoff point.`,
        h.timestamp, h.abilityId, what));
    }
  }
  return errors;
}

/** Whose attack hit the crystal: the spell's holder, the red whose head popped, or the Aero holder of that copy. */
function ownersOf(players: PlayerInfo[], casts: EnemyEvent[], ct: Ct | undefined, h: NpcHit): PlayerInfo[] {
  if (h.abilityId === LONGING) return players.filter((p) => removedNear(p, WYRMCLAW, h.timestamp, 500));
  if (!ct) return [];
  if (h.abilityId === UNHOLY) return holdersOf(ct, W_UNHOLY).filter((p) => blues(ct).includes(p));
  if (h.abilityId === DARK_ERUPTION) return holdersOf(ct, W_ERUPTION);
  if (h.abilityId === DARK_AERO) {
    const holders = holdersOf(ct, W_AERO);
    const cast = casts.find((c) => c.abilityId === DARK_AERO && c.sourceInstance === h.sourceInstance && Math.abs(c.timestamp - h.timestamp) <= 1500);
    if (cast?.target) return holders.filter((p) => p.name === cast.target);
    const targeted = casts.filter((c) => c.abilityId === DARK_AERO && c.target && Math.abs(c.timestamp - h.timestamp) <= 1500).map((c) => c.target);
    const rest = holders.filter((p) => !targeted.includes(p.name));
    return rest.length === 1 ? rest : [];
  }
  return [];
}

// ── deaths with no killing blow ─────────────────────────────────────────────

const playerOf = (players: PlayerInfo[], d: DeathEvent) => players.find((x) => x.name === d.player);
/** Their Wyrmclaw / Wyrmfang ran out (detectWyrmExpiry). */
const wyrmDeath = (p: PlayerInfo, d: DeathEvent) => p.debuffs.some((e) => (e.abilityId === WYRMCLAW || e.abilityId === WYRMFANG) && e.debuffStatus === "removed" &&
  d.timestamp - e.timestamp >= 1500 && d.timestamp - e.timestamp <= 2600 &&
  p.debuffs.some((a) => a.abilityId === e.abilityId && a.debuffStatus === "applied" && a.durationMs && Math.abs(a.timestamp + a.durationMs - e.timestamp) <= 600));
/** Mark of Mortality from a short stack killed them at the next hit (the stack's error). */
const markDeath = (p: PlayerInfo, d: DeathEvent) => p.debuffs.some((e) => e.abilityId === MARK_OF_MORTALITY && e.debuffStatus === "removed" && d.timestamp - e.timestamp >= 1500 && d.timestamp - e.timestamp <= 2600);
/** A Dark Knight's Walking Dead ran out unhealed. */
const walkingDead = (p: PlayerInfo, d: DeathEvent) => p.debuffs.some((e) => e.abilityId === WALKING_DEAD && e.debuffStatus === "removed" && d.timestamp - e.timestamp >= 1500 && d.timestamp - e.timestamp <= 2600);
/**
 * A player still under Damage Down walking out to clear it: within 36s of
 * getting it, or still holding it when they died (Damage Down lasts 180s;
 * A5/A10 reset before Phase 5 with a Crystallize Time Damage Down, B1 one
 * from Phase 3 as Phase 4 began).
 */
const ddReset = (p: PlayerInfo, d: DeathEvent) => p.debuffs.some((e) => e.abilityId === DAMAGE_DOWN && e.debuffStatus === "applied" && e.timestamp < d.timestamp &&
  (d.timestamp - e.timestamp <= DD_RESET_MS || !p.debuffs.some((r) => r.abilityId === DAMAGE_DOWN && r.debuffStatus === "removed" && r.timestamp > e.timestamp && r.timestamp < d.timestamp - DEATH_EVENT_LAG_MS - 500)));
const KNOCKS: Record<number, string> = { [REWIND_WINGS]: "Hallowed Wings", [DARK_AERO]: "Dark Aero III", [SPIRIT_TAKER]: "Spirit Taker", [LONGING]: "Longing of the Lost" };
const knockOf = (p: PlayerInfo, d: DeathEvent) =>
  p.damageTaken.filter((e) => KNOCKS[e.abilityId] && d.timestamp - e.timestamp >= KNOCK_MIN_MS && d.timestamp - e.timestamp <= KNOCK_MAX_MS).pop();

/** No-killing-blow deaths that are the wipe being called: 3+ within 10s, or one at the end with half the raid dead. */
function calledWipeDeaths(players: PlayerInfo[], deaths: DeathEvent[], life: Life, pullEnd: number): Set<DeathEvent> {
  const silent = deaths.filter((d) => {
    const p = playerOf(players, d);
    return !d.killingAbilityGameId && p && !wyrmDeath(p, d) && !markDeath(p, d) && !walkingDead(p, d) && !knockOf(p, d);
  });
  const out = new Set<DeathEvent>();
  const deadAt = (t: number) => players.filter((p) => !life.alive(p, t)).length;
  for (const d of silent) {
    if (pullEnd - d.timestamp <= CALLED_WIPE_END_MS && deadAt(d.timestamp - DEATH_EVENT_LAG_MS - 200) >= CALLED_WIPE_RAID_DEAD) out.add(d);
    const near = silent.filter((x) => Math.abs(x.timestamp - d.timestamp) <= CALLED_WIPE_WINDOW);
    if (near.length >= CALLED_WIPE_COUNT) near.forEach((x) => out.add(x));
  }
  return out;
}

/**
 * A no-killing-blow death is (in order): a Wyrmclaw / Wyrmfang running out
 * or Mark of Mortality (their own rules), Walking Dead running out (a
 * player-less note), a Spirit Taker knock (detectSpiritTaker), a knockback
 * out of the arena by Hallowed Wings, Dark Aero III or a red's own Longing
 * of the Lost (Major; an Aero set off by a dead holder is fallout), a
 * Damage Down reset, the raid resetting after another death, a killing
 * blow FFLogs dropped, or walking out.
 */
function detectWallDeaths(players: PlayerInfo[], deaths: DeathEvent[], called: Set<DeathEvent>, ct: Ct | undefined, life: Life, start: number, end: number): PullError[] {
  const errors: PullError[] = [];
  const aeroHolders = ct ? holdersOf(ct, W_AERO) : [];
  for (const d of deaths) {
    if (d.killingAbilityGameId || called.has(d) || d.timestamp < start || d.timestamp > end + DEATH_EVENT_LAG_MS) continue;
    const p = playerOf(players, d);
    if (!p || wyrmDeath(p, d) || markDeath(p, d)) continue;
    if (walkingDead(p, d)) {
      errors.push(playerlessMinor(ETD_WALL_RULE_ID, "Walking Dead Ran Out",
        `${p.name}'s Walking Dead ran out before they were healed to full, and they died. Living Dead needs the healers to fill the tank's HP within its 10s.`,
        d.timestamp - DEATH_EVENT_LAG_MS, WALKING_DEAD, "Walking Dead"));
      continue;
    }
    const kb = knockOf(p, d);
    if (kb?.abilityId === SPIRIT_TAKER) continue;
    if (kb?.abilityId === DARK_AERO && aeroHolders.some((x) => !life.alive(x, kb.timestamp - 300))) continue;
    if (!kb && (ddReset(p, d) || deaths.some((x) => x !== d && x.player !== d.player && x.timestamp <= d.timestamp && d.timestamp - x.timestamp <= RESET_AFTER_DEATH_MS))) continue;
    if (!kb && p.damageTaken.some((e) => (e.amount ?? 0) > 0 && e.timestamp <= d.timestamp && d.timestamp - e.timestamp <= SILENT_HIT_MS)) continue;
    const knocked = kb ? deaths.filter((x) => !x.killingAbilityGameId && Math.abs(x.timestamp - d.timestamp) <= 1500).length : 0;
    const by = kb ? KNOCKS[kb.abilityId] : "";
    errors.push(playerError(p, {
      ruleId: ETD_WALL_RULE_ID, severity: "Major", name: kb ? "Knocked Out of the Arena" : "Walked Out of the Arena",
      description: kb
        ? `Knocked out of the arena by ${by}${knocked > 1 ? ` (${knocked} players at once)` : ""}. ${kb.abilityId === REWIND_WINGS ? "The rewind's wings push everyone away from their origin while stunned: snapshot your Return far enough from the wall on your group's corner." : kb.abilityId === DARK_AERO ? "Dark Aero III knocks its surroundings back: the party stands so the push carries them across the middle, not toward the edge." : "A red player's Longing of the Lost knocks them back: pop the head facing so the push stays inside the arena."}`
        : "Died with no killing blow mid-pull: walked out of the arena.",
      timestamp: kb ? kb.timestamp : d.timestamp - DEATH_EVENT_LAG_MS, abilityId: kb ? kb.abilityId : 0, abilityName: kb ? by : "Deathwall",
    }));
  }
  return errors;
}

// ── entry point ─────────────────────────────────────────────────────────────

/**
 * Futures Rewritten Phase 4 (Enter the Dragon) errors. Self-gates on
 * Materialization, which no other fight uses; runs from Memory's End
 * passing (the end of oracle-of-darkness.ts) to the Phase 5 transition,
 * the enrage, or Paradise Lost.
 */
export function detectEnterTheDragonErrors(
  players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], npcHits: NpcHit[] = [], occurrences?: ReportedOccurrence[],
): PullError[] {
  const mat = enemyCasts.find((c) => c.abilityId === MATERIALIZATION);
  if (!mat) return [];
  const pass = enemyCasts.filter((c) => c.abilityId === MEMORYS_END_PASS && c.timestamp < mat.timestamp).pop();
  const start = pass ? pass.timestamp + 2000 : mat.timestamp - 12_000;
  const after = (ids: number[]) => enemyCasts.find((c) => ids.includes(c.abilityId) && c.timestamp > mat.timestamp);
  const transition = after([TRANSITION]);
  const enrage = after([ABSOLUTE_ZERO, MEMORYS_END]);
  const lost = after([PARADISE_LOST]);
  const stop = Math.min(transition?.timestamp ?? Infinity, enrage?.timestamp ?? Infinity, lost?.timestamp ?? Infinity);
  const deaths = deathEvents.filter((d) => d.timestamp <= stop + DEATH_EVENT_LAG_MS);
  const life = buildLife(players, deaths);
  // Deaths run to the pull's end even in a capture cut short with
  // --to-minutes; the other streams don't, so they bound the window.
  const dataEnd = Math.max(0, ...players.flatMap((p) => [...p.damageTaken, ...p.casts].map((e) => e.timestamp)));
  const lastEvent = Math.max(dataEnd, ...deathEvents.map((d) => d.timestamp));
  const end = Math.min(stop, dataEnd);
  const p4Deaths = deaths.filter((d) => d.timestamp >= start);
  const called = calledWipeDeaths(players, p4Deaths, life, transition ? Infinity : Math.min(stop, lastEvent));

  const dl = darklitOf(players, enemyCasts, start, end);
  const ct = ctOf(players, enemyCasts, start, end);
  const errors = [
    ...detectAutos(players, life, start, end, occurrences),
    ...detectAkhRhai(players, life, start, end),
    ...(dl ? [
      ...detectLightsteep(players, life, enemyCasts, dl, end),
      ...detectChains(players, life, enemyCasts, dl, end),
      ...detectDarklitWater(players, life, dl, end),
    ] : []),
    ...detectSpiritTaker(players, life, enemyCasts, deaths, start, end),
    ...detectHalfWings(players, life, start, end),
    ...detectBusters(players, life, start, end, occurrences),
    ...detectAkhMorn(players, life, enemyCasts, deaths, start, end, occurrences),
    ...detectAfah(players, life, enemyCasts, start, end),
    ...(ct ? [
      ...detectCtStacks(players, life, ct, end),
      ...detectAero(players, life, ct, end),
      ...detectCtAvoidables(players, life, ct, end),
      ...detectLonging(players, life, ct, end),
      ...detectWyrmExpiry(ct, deaths, end),
      ...detectDragonLap(players, life, ct, end),
      ...detectRewindWings(players, life, ct, end),
    ] : []),
    ...detectCrystal(players, enemyCasts, ct, npcHits, start, end),
    ...detectWallDeaths(players, p4Deaths, called, ct, life, start, end),
  ];
  errors.push(...unexplainedMarks(players, deaths, errors, start, end, ETD_MARK_RULE_ID));

  if (enrage) {
    const shiva = enemyCasts.find((c) => c.abilityId === ABSOLUTE_ZERO && c.timestamp > mat.timestamp);
    const gaia = enemyCasts.find((c) => c.abilityId === MEMORYS_END && c.timestamp > mat.timestamp);
    const left = [shiva && pct(shiva) !== undefined ? `Shiva ${pct(shiva)!.toFixed(1)}%` : "", gaia && pct(gaia) !== undefined ? `Gaia ${pct(gaia)!.toFixed(1)}%` : ""].filter(Boolean);
    errors.push(raidMarker(ETD_ENRAGE_RULE_ID, "Absolute Zero / Memory's End (Enrage)",
      `Shiva and Gaia weren't both brought down before their enrages (Absolute Zero and Memory's End).${left.length ? ` Left: ${left.join(", ")}.` : ""} The DPS check wasn't met.`,
      enrage.timestamp, enrage.abilityId, enrage.abilityName));
  }
  if (lost) {
    errors.push(raidMarker(ETD_CRYSTAL_RULE_ID, "Paradise Lost",
      "Phase 4 ended with the memory crystal gone, and Paradise Lost (the bad ending) wiped the raid.", lost.timestamp, PARADISE_LOST, "Paradise Lost"));
  }

  // Generic cutoffs, only the earliest and only before any mechanic Raid.
  const generic: PullError[] = [];
  const calledList = p4Deaths.filter((d) => called.has(d)).sort((a, b) => a.timestamp - b.timestamp);
  if (calledList.length >= CALLED_WIPE_COUNT) {
    generic.push(raidMarker(ETD_CALLED_WIPE_RULE_ID, "Wipe Called",
      `${calledList.length} players died with no killing blow (${joinNames(uniq(calledList.map((d) => d.player)))}): the wipe was called and the raid reset.`,
      calledList[0].timestamp - DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  if (!transition) {
    const outAt = (t: number) => players.filter((p) => !life.alive(p, t));
    const collapseT = life.outIntervals.map((w) => w.start).filter((t) => t >= start && t <= end).sort((a, b) => a - b)
      .find((t) => outAt(t).length >= COLLAPSE_DEAD_COUNT);
    if (collapseT !== undefined) {
      const who = outAt(collapseT).map((p) => p.name);
      generic.push(raidMarker(ETD_COLLAPSE_RULE_ID, "Party Collapse",
        `${who.length} players were dead at once (${joinNames(who)}). No Phase 4 pull recovered from four down; treated as the cutoff point.`,
        collapseT + DEATH_EVENT_LAG_MS, 0, "Deaths"));
    }
  }
  const firstRaid = Math.min(...errors.filter((e) => e.severity === "Raid").map((e) => e.timestamp));
  const marker = generic.sort((a, b) => a.timestamp - b.timestamp)[0];
  if (marker && marker.timestamp < firstRaid) errors.push(marker);
  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
