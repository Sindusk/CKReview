// The Omega Protocol (Ultimate) -- Phase 6: Alpha Omega.
// Entry point: detectAlphaOmegaErrors. Self-gates on Cosmo Memory (31649),
// P6's opening raidwide, and runs from it to the pull's end.
//
// -- VERIFIED AGAINST LOGS (2026-10-15) --
// The static of blue-screen.ts and run-dynamis.ts (not the user's; no VOD;
// NAUR strats, which the user confirmed). Every pull on disk that reached
// P6, refetched --refetch --from-minutes 6.8 with no end (the P4/P5 spans
// are unchanged). Letters follow run-dynamis.ts; cited as J7 +77.0
// (report letter, the report's own pull number, seconds from Cosmo
// Memory's hit, which lands 14:31-14:45 into the pull):
//   J = K9nqQw6ZRjWbgGMc: J7 J14 J17 J20.
//   K = C8bQAFtakJBYxM6n: K22.
//   L = bNcrLh7Y4dkHxM9q: L14 L15 L16; L16 is the kill.
//   8 P6 pulls: 6 wiped at the first or second Wave Cannon, J14 at the
//   second Magic Number, L16 killed at +252.0.
// Clock from 31649, every pull within ~0.2s: Flash Gale volleys (visual
// 31747, damage casts 32223 targeted at the two tanks) +5.6/+8.7,
// +39.7/+42.8, +81.9/+85.0, +115.8/+118.9, +153.0/+156.1. Cosmo Arrow
// 31650 +14.3 and +91.3 (first lines 31651, then 31652 every 2s). Cosmo
// Dive 31654 +29.1 and +143.0, hits 2.4-3.0s later: busters 31655 on the
// two tanks, share 31656 on the other six, in all 10 Dives. Unlimited Wave
// Cannon 31660 +47.4 and +124.2: exaflares 31661/31662, six puddle rounds
// 31663 2s apart from +55.5. Wave Cannon spreads 31659 (cast-targeted, 4
// then 4 two seconds later) +68.7/+70.7 and +102.5/+104.5; Wild Charge
// 31658 +77.0 and +110.9. Cosmo Meteor 31664 +164.5: centre baits 31666
// +168.5, spreads 32699 (cast-targeted, two per player) +169.7..+176.8,
// stack 31667 and flares 31668 +187.8. Magic Number 31670 +199.9 and
// +216.1, its aura 1003532 on everyone alive 2s later. Run 31648 +241.2.
// No Damage Down anywhere in P6, and the Brilliant Dynamis buffs aren't in
// the fetched buff stream.
// Findings:
// - Deaths cascade. A player raised in P6 has lost Brilliant Dynamis: the
//   raised DRG took 82k from the Dive share the others took 43-53k from
//   (J14 +146.4) and died again to their own Meteor spread; a raised WAR
//   died to their own Wave Cannon line (J20 +71.3). Those later deaths are
//   fallout. Every wipe's first death was a mechanic failure or raw damage
//   (J20's WAR to the first Dive buster, 141k: not flagged, J14's DRG to
//   the second charge with eight sharing).
// - Wave Cannon spreads (NAUR): supports on the cardinals (WAR N, SCH E,
//   DRK S, WHM W), DPS on the intercardinals (DNC NE, DRG SE, the second
//   melee or RDM SW, PCT NW) in all three reports. 91 clean hits sat within
//   21 degrees of their group's clock and 7.0y+ out. A line that hits two
//   players loses its cast target; its owner is the victim no line of the
//   4 + 4 pair targeted. Overlaps: J7 +68.7 the WHM 3.3y from the boss,
//   inside every line, clipped by two (the DRG's own line among them: the
//   DRG, 30 degrees off, wasn't the cause); K22 +68.7 the WHM 4.1y out
//   and the DRK 38 degrees off, their lines through the NIN (three died);
//   L14 +70.7 the PCT on the DRK's south spot, 43 degrees off (died). J14
//   +68.7: the DRG's line (18 degrees off) clipped the DRK on their spot;
//   each took one line per set, so nobody died. Each line's Magic
//   Vulnerability Up (1002941) lasts 1.96s and the second set lands 2.0s
//   later: the DRK's first vuln came off in the same millisecond their own
//   line reapplied it (31k then 39k, 117k HP). Two lines in one set kill
//   (J7, K22); one per set is survivable with Brilliant Dynamis. Positions are read at the
//   hit, so "off the spot" can be "still on the way" (a player in the
//   fights, 2026-10-15). After a
//   death the second set retargets a player already hit, who dies to it
//   (J17 +104.5, the DNC after the WAR's Arrow death): fallout.
// - Wild Charge stacks south, tanks in front (they take 2-4x and invuln:
//   Walking Dead, Holmgang). Every living player was hit in every clean
//   charge, all within 1.5y of the line. J7 +77.0: the SCH stood 6.4y off
//   it, the line went their way, three of seven shared it, the WAR and SCH
//   died. A charge with fewer than eight kills: L14 (7 sharing, 2 died),
//   L15 (7, 5), J17 (6, 6), K22 (5, 5); J20 (7, 1) and J14 (8, 1) didn't
//   end the pull.
// - Flash Gale: the WAR holds the boss at 4-7y, the DRK baits the far gale
//   at ~15y (both reports). It went to the two tanks in every volley with
//   both alive but one: J17 +81.9, the DRK was 8.8y out (Walking Dead,
//   inside the party), the DRG farthest at 11.1y, and the far circle hit
//   six non-tanks. With a
//   tank dead the gales land on the party (J20 +39.7; J7, J20, L14 after
//   the first charge: four died in J20).
// - Avoidables: Unlimited's puddles hit only J7's DRK (four at once,
//   died); the exaflares and Meteor baits hit nobody; Cosmo Arrow's second
//   set killed J17's WAR and L15's RPR (two pulses each).
// - Cosmo Meteor (J14, L16 only): spreads clean apart from the
//   retargeting above (J14's WAR took a third after the DRG died); no add
//   enrage (31669) cast; flares and stack clean.
// - Magic Number: healer LB3 cleared the aura 2.3-3.4s after it landed;
//   J14's second ran out at 6.0-6.2s with no SCH LB and killed the five
//   holders 2s later (silent deaths). The WAR who gave the LB before it
//   had died at Meteor (+177.5) and been raised, so their Land Waker
//   refunded nothing to the SCH. The DRK dies to both Numbers in both
//   pulls after Dark Force: the planned DRK sacrifice [EL].
// - Any other P6 death ends the pull (a player in the fights, 2026-10-15):
//   Brilliant Dynamis (~80% mitigation and the LB refund) goes with it, so
//   a dead tank can't survive Magic Number and the LB chain breaks. Every
//   wipe bears it out: no pull recovered from a P6 death.
// - LB3 order in the kill: RPR after the second Dive, DNC for the Meteors,
//   DRK, WHM, WAR, SCH for the Numbers.
// - Silent deaths all came after a cutoff: Walking Dead running out (J7,
//   L14), the Number aura (J14), resets. No deathwall death before one.
// No wipe left unexplained. Cutoffs (first Raid error) over the 7 P6
// wipes, all the first P6 death: Wave Cannon spread overlaps 2 (K22 the
// WHM, L14 the PCT), Cosmo Arrow 2 (J17 WAR, L15 RPR), Unlimited's
// puddles 1 (J7 DRK), and two raw-damage deaths nobody is named for (J20
// the WAR to the first Dive buster, J14 the DRG to the second charge with
// eight sharing). The kill has no P6 error.
//
// -- RULES IMPLEMENTED --
// ffxiv-top6-avoidable (Major on death, else Minor: P6 gives no Damage
//   Down): Cosmo Arrow, Unlimited's exaflares and puddles, Meteor baits.
// ffxiv-top6-spread: a Wave Cannon line that hit anyone besides its owner.
//   Players within 5y of the boss own every line they're in; otherwise
//   the line's players off their group's clock (23+ degrees), else the
//   one 10+ degrees worse than the rest, else all. Major on a death.
// ffxiv-top6-charge: with all eight alive, a player 4y+ off the Wild
//   Charge line, or (nobody off it) a player it missed. Major on a death.
// ffxiv-top6-gale (targeted: both tanks at each volley with both alive):
//   two or more non-tanks hit and a non-tank the farthest player: names
//   the tank who took neither gale; player-less otherwise.
// Raid, the earliest kept: -death (the first P6 death, bar a tank dying to
//   Magic Number after their tank LB3; -called-wipe when that death is a
//   reset), -magic-number (the aura ran out with nobody dead yet).
// Exposure: gale is targeted (the tanks); the rest test everyone.
// Not built: the opening tank LB, Cosmo Dive (busters always on the tanks,
// the share always six: open question 1 stays open), Meteor spreads,
// flares, stack and add enrage, an early or missing tank LB at Magic
// Number and the final Run's enrage (none failed on disk); the deathwall
// (no wall death before a cutoff); who owed a missing healer LB3 (the
// gauge isn't logged; J14's description lists the LBs and earlier deaths).
//
// -- GUIDE-DERIVED MODEL (2026-10-14; NOT VERIFIED AGAINST LOGS) --
// Comment-only research. All failure signals are guide-inferred; no
// local report/VOD verification. Ultimate 6.31 script, sync 635.
// Launch job/mitigation/LB-gain advice can change with balance and gear.
// An earlier death usually invalidates P6, but documented late-Magic
// Number recovery plans make "every death = instant Raid" inaccurate.
//
// -- SOURCES CHECKED 2026-10-14 --
// [IV] Meru, target/buff/LB sequences and two movement variants:
// https://www.icy-veins.com/ffxiv/the-omega-protocol-ultimate-phase-6-guide
// [EL] Tuufless, east stack/1.5-marker exaflares, LB FAQs, DRK sacrifice:
// https://ffxiv.tuufless.com/elemental/top/06_alpha_omega/
// Author source read: github.com/tuufless/FFXIV-Elemental-Raid-Macros,
// main/_elemental/top/06_alpha_omega.en.md.
// [TH] LPDU arrows, south stacks, far Dive, Cover recovery:
// https://thaliak.com/ultimates/top/
// [OCE] Both players move in Arrow 2, one-marker exaflare entry:
// https://materiaraiding.com/resources/visitorsguide
// [CB] Event clock and actual enrage-duration note:
// https://github.com/quisquous/cactbot/blob/main/ui/raidboss/data/06-ew/ultimate/the_omega_protocol.txt
// [BM] Candidate action mappings and geometry:
// https://github.com/awgil/ffxiv_bossmod/blob/master/BossMod.Ultimate/Endwalker/Ultimate/TOP/TOPEnums.cs
// Same directory P6CosmoArrow.cs, P6CosmoDive.cs, P6FlashGale.cs,
// P6WaveCannon.cs and P6CosmoMeteor.cs also read. These are public
// encounter definitions, not verified FFLogs spell IDs or reports.
//
// -- SHAPE, CLOCK AND LIMIT BREAK ECONOMY --
// ~55s transition after successful Blind Faith, then targetable Alpha.
// Cosmo Memory -> Arrow+Dive -> Unlimited+Wave -> Arrow+Wave ->
// Unlimited+Dive -> Meteors -> Magic Number twice -> final Run enrage.
// Two paired autoattack volleys between combos; none after Meteor flares.
// CB offsets BELOW from P6 targetability (1154.7 artificial anchor):
// +13.1 Memory; autos +18.1/+21.3; +27.5 Arrow control, +44.6 Dive hits;
// autos +52.3/+55.5; +60.7 Unlimited; puddles +68.7..78.2;
// +81.3/+83.3 four-player Wave sets, +89.6 Wild Charge;
// autos +94.6/+97.8; +104 Arrow; +115.2/+117.2 Wave, +123.5 charge;
// autos +128.5/+131.7; +137 Unlimited; +145..154.5 puddles;
// +157.7 Dive hits; autos +165.4/+168.5;
// +176.9 Meteor control, +180.9 puddles; spreads +182/+183/+188/+189;
// adds targetable ~+184.6 (CB explicitly marks this approximate);
// +200 Meteor flares/stack, ~+202.3 surviving-add enrage;
// Magic Number +207/+212 cast/hit, +223.1/+228.1 cast/hit;
// final Run begins +237.2, completes ~+267.2 (4:27 targetable phase).
// TH includes transition in its P6 duration (~5:08). Not the same origin.
// Complete kill requires boss 0 HP; no 20% threshold for final enrage.
// Standard LB sequence:
//   tank LB3 for opening Memory using ordinary preexisting gauge;
//   rebuild LB3 during first four combos;
//   melee A LB3, melee B LB3 after second Dive;
//   caster LB3 then physical ranged LB3 for Meteor adds;
//   tank A LB3 -> healer A LB3 -> tank B LB3 -> healer B LB3;
//   final melee LB3 during Run (already-spent melee, no refund).
// Five damage LBs total (three melee, caster, ranged), three tank,
// two healer: TEN casts in this normal composition. Refund chain begins
// with melee A; each of eight players consumes Brilliant exactly once.
// Initial tank LB occurs BEFORE Brilliant, so that tank can refund a
// second tank LB later. Final melee uses gauge returned by last healer.
//
// -- COSMO MEMORY / QUICKENING -> BRILLIANT -> SPARK --
// Candidate Memory cast/damage 31649. Player buffs Quickening Dynamis
// 3444 (game ID), Brilliant Dynamis, Spark of Dynamis; latter IDs unknown
// in inspected BM table, so no guessed FFLogs aura numbers.
// What happens: opening lethal raidwide requires tank LB3 plus planned
// shields/mitigation. Surviving players with THREE Quickening gain
// Brilliant: major encounter damage reduction plus one LB refund.
// Using an LB converts that user's Brilliant to Spark and returns the
// spent number of bars. Spark retains reduction but has no further refund.
// Both P6 buffs are lost on death, unlike P5 Quickening [IV/EL].
// Correct play: all eight at three from P5, timely assigned opening
// tank LB; reserve each player's one refund for the stated LB chain.
// Failure modes:
//   Missing opening tank LB -> LOG SIGNAL: no protective tank LB buff
//     at 31649, party deaths; FAULT: assigned tank if duty known;
//     CONSEQUENCE: Major plus Raid. Correct LB but low HP is mit review.
//   Missing Brilliant -> LOG SIGNAL: <3 pre-Memory stacks/no conversion,
//     subsequent greatly increased damage; FAULT: earlier P5 assignment
//     root cause if known, not a new error on each victim;
//     CONSEQUENCE: Raid when required survival/refunds impossible.
//   Premature refund use -> LOG SIGNAL: Brilliant->Spark on unexpected
//     LB cast, later required LB cannot be supplied; FAULT: caster by
//     declared LB plan; CONSEQUENCE: Major and Raid when chain is lost.
// Removal: conversion, LB use, death. Raises do not restore Brilliant
// or Spark, nor a second refund. The exact initial gauge boost unsettled.
// Not errors: expected Memory damage, first tank LB without refund,
// Spark on a player who already performed their intended LB.
//
// -- AUTOATTACKS / FLASH GALE --
// Candidates: boss visual auto 31747, actual Flash Gale damage 32223
// (5y victim circles [BM]); different from ordinary single-target autos.
// What happens: each volley selects main enmity target AND furthest
// player; two volleys between combos. Same player can receive both.
// EL explicitly says damage bypasses invulnerabilities; raw behavior
// and damage type need log confirmation, not assumed ordinary melee.
// Correct play: MT holds hate close, ST furthest and >5y from party;
// maintain distance through both volleys, heal after low-HP invulns.
// Failure -> LOG SIGNAL: 32223 on non-tank as primary or extra victim,
// duplicate primary on MT, distance/target history at snapshot;
// FAULT: furthest bait/spacing failure if known; CONSEQUENCE: Major if
// lethal, otherwise Minor absent Damage Down. Correct tank death is not
// proof of mechanic error. Losing MT can deliberately leave a survivable
// enmity hit on DPS for practice [IV]; not automatic DPS blame.
// Removal: individual hits, no compulsory swap aura.
// Not errors: ST far hits, MT enmity hits, ST stance off, deliberate
// practice survival after MT death; actual tank assignments may differ.
//
// -- COSMO ARROW: TWO PATTERNS / TWO OCCURRENCES --
// Candidates: visual controller 31650; first ground cast/damage 31651
// (10y-wide rectangles); advancing damage 31652 (5y widths [BM]);
// inhale visual 32337. Visual control is not an avoidable-hit signature.
// What happens: center cross then outside border, OR outside then cross;
// then squares advance out from center/in from border every pulse.
// Patterns are independently selected; no guarantee of one of each.
// Correct play: dodge into just-cleared lanes, use boss hitbox/waymarks
// rather than animation ending as a timing clock. Common movement cue:
//   cross first: in, wait, out, wait, sides/spread, in;
//   border first: out, wait, in, sides/spread, in.
// These describe SAFE destinations after hits, not the initial telegraph.
// Arrow 1 permits six players together, tanks separate or all eight
// practice clock routes; ends in Dive. Arrow 2 requires eight spread
// beam angles during the last pulses, then Wild Charge stack.
// IV starts pairs intercardinal, cardinal members peel toward their clock.
// OCE both members move: DPS CW, supports CCW; NA often leaves DPS
// unchanged [OCE comparison]. EL and TH use their own route geometry.
// Failure -> LOG SIGNAL: 31651/31652 damage, Damage Down/death;
// FAULT: bad dodge unless another bait caused it; CONSEQUENCE: Major
// for Damage Down/death, Raid if early loss breaks bodies/refunds.
// Removal: each square pulse clears, no dispel/cleanse. Not errors:
// either valid route/pattern, deliberate partial disengage for safe dodge.
//
// -- COSMO DIVE: CLOSE TANKS / FAR SIX-PLAYER SHARE --
// Candidates: visual cast 31654; tank damage 31655 (8y circle);
// shared damage 31656 (6y circle). Two occurrences after Arrow 1 and
// Unlimited 2. Actual hits ~2.4s after controller completion [CB].
// What happens: two closest players receive busters; FURTHEST player
// receives six-person stack [EL/TH/BM]. IV says THIRD CLOSEST instead.
// Correct play: tanks closer than all others and separated >8y; six
// non-tanks clustered farther out. Then ST immediately becomes furthest
// for next auto volleys, without splashing party. Enmity does not choose
// Dive busters. Under both disputed rules, normal stacked non-tanks
// obscure selection; a spread sample would discriminate it.
// Failure modes:
//   Wrong close bait/overlap -> LOG SIGNAL: 31655 on non-tank or extra
//     victims, tank/party death; FAULT: tank too far or non-tank too near
//     / wrong spacing by plan; CONSEQUENCE: Major, possible Raid.
//   Wrong far stack/missing share -> LOG SIGNAL: isolated 31656 target,
//     <6 share/high split damage; FAULT: far interloper/absent member
//     only when established; CONSEQUENCE: Major if lethal, Raid if
//     continued bodies/refunds fail. No inferred hard six-person penalty.
// Removal: direct hits, vulnerability if any to verify. Not errors:
// correct buster/share damage, tank mitigation instead of invulnerability.
//
// -- UNLIMITED WAVE CANNON: EXAFLARES / SIX PUDDLE SETS --
// Candidates: controller 31660; first exaflare cast/damage 31661,
// repeat 31662 (8y circles); baited puddle casts/damage 31663 (6y).
// What happens: four successive exaflare starts along outer arc, CW or
// CCW, traveling across arena. BM models seven explosions per line,
// advancing 8y every ~1.1s (candidate, not measured here).
// Six rounds of puddles under EACH player, ~1.9s apart, ~3s delayed;
// 48 baits per occurrence, 96 across two, normally co-located by stack.
// Correct play: all center, identify first start and spawn order, move
// into cleared path with deliberate stagger steps; stay grouped so
// individual puddles do not block others. EL enters 1.5 markers (~67.5
// degrees) before first start; IV/TH/OCE often one marker (~45 degrees).
// Route/step timing differs, successful clearing of both hazards agrees.
// First ends in spread/Wild Charge; second stops after sixth for Dive.
// Failure -> LOG SIGNAL: 31661/31662/31663 damage, bad prior ground
// bait position; FAULT: wrong dodger or route-blocking baiter if ground
// source/assignment proves it; CONSEQUENCE: Major for death/Damage Down.
// Removal: pulses/puddles resolve and clear; first arrows are visuals.
// Not errors: co-located baits, either cleared entry path, travel along
// former exaflare lane. Animation count is not eight unique player hits.
//
// -- WAVE CANNON: FOUR+FOUR SPREADS / WILD CHARGE --
// Candidates: controller cast 31657; spread line damage 31659
// (8y wide); Wild Charge damage 31658 (8y wide [BM]).
// What happens: four random targets then remaining four ~2s later,
// each with magic vuln; after ~6s, all-party share with extra damage on
// FIRST TWO players along line. Two occurrences, second overlaps Arrow.
// Correct play: eight distinct angles for both spread sets; then one
// line, tanks at front and six others behind. EL stacks east; TH/OCE
// south; IV permits healer-friendly chosen location. Tank order/invuln
// plan varies with P5 cooldowns; common one invuln and one heavy mit.
// Failure modes:
//   Spread clip -> LOG SIGNAL: extra/double 31659 hits with vuln;
//     FAULT: wrong angle/baiter if known; CONSEQUENCE: Major, likely Raid.
//   Wrong front/absent share -> LOG SIGNAL: non-tank gets amplified
//     31658, reduced recipients/high damage; FAULT: tank behind party
//     or incorrect member position by plan; CONSEQUENCE: Major if lethal.
// Removal: temporary spread vulnerability must expire before charge;
// exact duration and charge aiming target are unsettled (BM TODO).
// Not errors: intended spreads/share, both tanks taking large front hits,
// job-dependent cooldown use. Low HP/raw damage deaths are mit review.
// EL warns extra boss damage-reduction debuffs during spreads can reduce
// survival-based ordinary LB gain. This is a mitigation-plan consideration,
// not automatic blame on whoever casts Addle/Reprisal; validate gauge first.
//
// -- COSMO METEOR: BAITS / ADDS / FOUR SPREAD VOLLEYS --
// Candidates: controller 31664; ground bait 31666 (10y radius);
// player spread damage 32699 (5y); adds Cosmo Meteor 0x3D6E,
// Cosmo Comet 0x3D6F (object IDs, not action IDs); add enrage 31669.
// What happens: eight giant baits at center, then two large Meteors
// north/south plus SIX small Comets [IV/TH]; EL text says FIVE (disputed).
// Four volleys each hit four players, in two complementary 4+4 sets:
// 16 intended personal hits, two per player, magic vulnerability.
// Correct play: clear center baits, spread clocks inside healing range;
// caster LB3 at boss-centered adds kills Comets and damages both Meteors,
// refund -> physical ranged LB3 from north OR south through both big adds
// and boss. Regular attacks on adds are not mechanically forbidden;
// common plan reserves player DPS for boss because LBs kill them fully.
// One healer may return center after puddles clear, remaining >5y from
// other spread victims. Two-healer-center layout also documented [IV].
// Failure modes:
//   Bait/spread clip -> LOG SIGNAL: 31666 or extra 32699 hits/deaths;
//     FAULT: entrant/bad spacing by agreed spots; CONSEQUENCE: Major.
//   Adds not cleared -> LOG SIGNAL: living add completes 31669 / missing
//     caster/ranged LB damage to intended actors; FAULT: assigned LB user
//     only if bad aim/late cast proven, otherwise raid gauge/plan issue;
//     CONSEQUENCE: Raid plus Major on evidenced responsible caster.
// Removal: adds die to damage, enrage if alive at deadline (~15s [TH]);
// precise spawn/targetable/death and on-death effects need verification.
// Not errors: LB damage to adds, healer center, moving tank's normal
// north clock to give ranged north, no ordinary add damage in valid plan.
//
// -- COSMO METEOR: THREE FLARES / FIVE-PLAYER STACK --
// Candidates: flare damage 31668 (proximity falloff, radius unknown);
// shared stack 31667 (6y). Flare headmarker 346; stack not telegraphed.
// What happens: three flare holders; random one of other five owns
// stack. Ranged is still animation-locked after LB3, party adjusts.
// Correct play (ranged north): if ranged flare, other flares E/W,
// five-person stack S; otherwise flares S/E/W, stack N on ranged.
// If ranged south, mirror N/S. Flares separate at cardinals, max melee
// or farther if necessary; healing/shields must reach all eight.
// Failure -> LOG SIGNAL: excessive proximity damage / poor distances,
// flare in stack, missing 31667 sharer or deaths; FAULT: failed party
// adjustment or misplaced flare if established, not immobile LB user;
// CONSEQUENCE: Major, Raid if future tank/healer refunds lost.
// Removal: flare/stack resolve simultaneously, no further autos.
// Not errors: intended flare raid damage, planned LB immobility,
// five-player rather than eight-player stack, adjusted cardinal spots.
//
// -- MAGIC NUMBER: TWO TANK LB -> HEALER LB CHECKS --
// Candidate cast/raidwide 31670; player aura Magic Number (ID unknown).
// What happens: two huge raidwides ~16s apart; tank LB3 survives each.
// Each gives six-second lethal aura, cleared ONLY by healer LB3.
// Correct play: designated tank LB at start of 5s cast; designated
// healer LB AFTER damage/aura apply (guide cast time ~2s), within 6s.
// Use different unspent Brilliant tanks/healers for refunds. Healer LB
// also raises dead players without Weakness; death does not regain refund.
// Failure modes:
//   Missing/late tank LB -> LOG SIGNAL: 31670 without protective buff,
//     raid deaths; FAULT: assigned user only if gauge/role viable;
//     CONSEQUENCE: Major plus Raid, except declared late recovery plan.
//   Early/late healer LB -> LOG SIGNAL: aura persists after early cast
//     or expires before heal LB, expiry deaths; FAULT: assigned healer
//     if able and gauge available; CONSEQUENCE: Major plus Raid.
// Removal: healer LB3 cleanse versus fatal expiry/death; ordinary
// Esuna is not the guide-described solution.
// Not errors / late variants: EL DRK cancels tank-LB buff on themselves
// after using their refundable tank LB FIRST, dies to each Number and
// is promptly raised by healer LB for MP. After autos end this sacrifice
// is intentional; prior loss of unspent Brilliant would break refund.
// TH describes PLD Cover shielding a surviving healer from Number aura
// to salvage a missed healer refund, with sacrifice/raise sequencing.
// This is a guide-described exceptional recovery, not verified locally;
// it prevents assuming ordinary P6 death always makes the pull inevitable.
//
// -- STRATEGY AGREEMENT --
// IV/EL/TH agree on the combo order, separate close tanks, spread waves
// before two-front-tank charges, center puddle baits, ranged/caster add
// LBs and two tank->healer LB pairs. EL east versus TH/OCE south charge,
// one-marker versus 1.5-marker exaflare entry, Arrow 2 peel directions,
// healer-center choice and job-dependent invuln/LB ordering differ.
// These plans meet at hit geometry and refund availability, not one set
// of compass spots. DRK/PLD exceptions apply only when explicitly chosen.
//
// -- FINAL RUN / WHAT ENDS A PULL --
// Candidate Run: ****mi* cast/damage 31648. BM/client label says 16s;
// CB observes ~30s, EL calls 30s. Actual completion ~+267.2 targetable
// clock is the enrage, not the start or nominal cast duration.
// Final melee LB and last burst are normal here. IV's ~17% HP at cast
// start is a launch DPS heuristic, not an instant wipe threshold.
// Early lost Brilliant/Spark normally means next hit kills and LB duties
// are lost. Add enrage, uncleaned Number, missing required refund/gauge
// are Raid outcomes; late sacrifice/Cover exceptions require real plan.
// Deathwall remains lethal; EL describes ~5s grace after entering it,
// independent of actions. Ability-less deaths or later called resets
// are not evidence of a missed beam. Exact wall behavior needs logs.
//
// -- OPEN QUESTIONS / SOURCE DISAGREEMENTS FOR LOG VERIFICATION --
// 1. Dive stack: IV third-closest versus EL/TH/BM furthest. Confirm actual
//    target independently of standard six-player cluster; snapshot timing?
// 2. Meteor adds: EL five Comets versus IV/TH six. Count unique spawned
//    actors and caster LB victims, add deadlines and enrage ownership.
// 3. Enrage: 16s label versus ~30s actual; phase clock starting at
//    targetability versus transition explains other timing discrepancies.
// 4. Brilliant/Spark/Magic Number aura IDs; initial gauge gain wording
//    (~90% "of an LB bar" [IV]) and timing, refunds, death removal.
// 5. Flash Gale ignores invulns [EL]? Damage type, two primaries per
//    volley, radius, furthest reselection and auto target tie handling?
// 6. Wild Charge aiming target [BM TODO], actual front-two order/damage
//    scaling, vuln durations and any distinct failed-share action?
// 7. P6 avoidables lethal versus Damage Down, exaflare count/timing,
//    1-marker versus 1.5-marker route, Arrow 2 NA/OCE movement plan.
// 8. Meteor flare falloff/stack target selection, two-healer center
//    geometry, ranged animation lock and exact LB execution/refund times.
// 9. Number cleanse timing, planned DRK sacrifice/Cover exceptions and
//    five-second wall grace. Can actual recovery complete the DPS check?
// 10. EL survival-based LB generation explanation is a guide claim;
//     verify gauge evidence before calling boss-debuff use a mistake.

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import type { ReportedOccurrence } from "@/lib/mechanics/occurrences";
import { ARENA_CENTER, angularDistance, compassBearingOf } from "@/lib/mechanics/geometry";
import { interpolatePlayerPosition } from "@/lib/mechanics/player-position";
import { kFmt, joinNames, playerError, raidMarker, playerlessMinor, clusterByGap } from "@/lib/mechanics/wow/common";
import { DEATH_EVENT_LAG_MS, PREVIEW_AMOUNT, type Life, bodyHit, buildLife, uniq, realAmount, resetCluster } from "../fru/common";

export const TOP6_AVOIDABLE_RULE_ID    = "ffxiv-top6-avoidable";
export const TOP6_SPREAD_RULE_ID       = "ffxiv-top6-spread";
export const TOP6_CHARGE_RULE_ID       = "ffxiv-top6-charge";
export const TOP6_GALE_RULE_ID         = "ffxiv-top6-gale";
export const TOP6_DEATH_RULE_ID        = "ffxiv-top6-death";
export const TOP6_MAGIC_NUMBER_RULE_ID = "ffxiv-top6-magic-number";
export const TOP6_CALLED_WIPE_RULE_ID  = "ffxiv-top6-called-wipe";

const COSMO_MEMORY = 31649; // P6's opening raidwide: the module's gate and clock
const SPREAD       = 31659; // Wave Cannon's 4 + 4 spread lines
const CHARGE       = 31658; // Wild Charge: the all-party line share
const FLASH_GALE   = 32223; // the paired autos: enmity target and farthest player
const MAGIC_NUMBER = 31670;
const NUMBER_AURA  = 1003532; // Magic Number's lethal six-second aura
const WALKING_DEAD = 1000811;
const AVOIDABLE: Record<number, string> = {
  31651: "Cosmo Arrow", 31652: "Cosmo Arrow",
  31661: "Unlimited Wave Cannon's exaflares", 31662: "Unlimited Wave Cannon's exaflares",
  31663: "Unlimited Wave Cannon's puddles", 31666: "Cosmo Meteor's centre baits",
};
const AVOID_WHY: Record<string, string> = {
  "Cosmo Arrow": "Cosmo Arrow's squares advance from the centre (or the border) every 2s: step into the lane that just exploded.",
  "Unlimited Wave Cannon's exaflares": "the exaflares advance around the arena: enter behind the first one as it passes, with the group.",
  "Unlimited Wave Cannon's puddles": "six puddles drop under each player: keep stepping with the group onto ground that has already exploded.",
  "Cosmo Meteor's centre baits": "bait the Meteors in the centre, then leave before they land.",
};
const LB3 = new Set([
  "Last Bastion", "Land Waker", "Dark Force", "Gunmetal Soul",
  "Pulse of Life", "Angel Feathers", "Astral Stasis", "Techne Makre",
  "Final Heaven", "Chimatsuri", "Doom of the Living", "The End", "Dragonsong Dive", "World-swallower",
  "Sagittarius Arrow", "Satellite Beam", "Crimson Lotus",
  "Meteor", "Teraflare", "Vermilion Scourge", "Chromatic Fantasy",
]);
const TANK_LB3   = new Set(["Last Bastion", "Land Waker", "Dark Force", "Gunmetal Soul"]);
const HEALER_LB3 = new Set(["Pulse of Life", "Angel Feathers", "Astral Stasis", "Techne Makre"]);

// Wave Cannon spreads (NAUR): supports on the cardinals, DPS on the
// intercardinals, every line aimed out from the boss in the centre. Clean
// hits sat within 21 degrees of their group's clock (91 hits; J14 +1:43
// the worst) and 7.0y+ from the centre (J20 +1:11); the misplaced players
// were 25-43 degrees off (J7 K22 L14) or 3.3-4.1y from the centre, inside
// every line (J7, K22).
const SUPPORT_CLOCKS = [0, 90, 180, 270];
const DPS_CLOCKS     = [45, 135, 225, 315];
const SPOT_DEG       = 23;
const SPOT_MARGIN_DEG = 10; // below SPOT_DEG, a line's player this much worse than the rest owns it
const CENTRE_Y       = 5;
// Wild Charge: the party stacks on one line out from the boss. Clean
// charges held every player within 1.5y of the line (J14 / J17 / L16); the
// misplaced player stood 7.5y off it (J7). Line half-width is ~4y.
const CHARGE_LATERAL_Y = 4;
const CHARGE_MIN_R_Y   = 5; // closer than this the bearing is noise (the front tanks)
const NUMBER_EXPIRY_MS   = 5000; // healer LB3 cleared the aura 2.3-3.4s after it landed; J14 ran out at 6.0-6.2s
const CALLED_WIPE_END_MS  = 12_000;
const CALLED_WIPE_COUNT   = 3;
const CALLED_WIPE_WINDOW  = 10_000;

const names = (ns: string[]) => joinNames(uniq(ns));
const byName = (players: PlayerInfo[], n: string) => players.find((p) => p.name === n);
const yalms = (x: number, y: number) => Math.hypot(x - ARENA_CENTER, y - ARENA_CENTER) / 100;

type Hit = { p: PlayerInfo; e: PlayerEvent };

const liveHits = (players: PlayerInfo[], life: Life, ids: number[], from: number, to: number): Hit[] =>
  players.flatMap((p) => p.damageTaken.filter((e) => ids.includes(e.abilityId) && e.timestamp >= from && e.timestamp <= to && !bodyHit(e) && life.hitAlive(p, e.timestamp)).map((e) => ({ p, e })));

/**
 * A player who died earlier in P6 has lost Brilliant Dynamis (its damage
 * reduction and its LB refund), so the next big hit kills them: fallout of
 * that first death, never its own error.
 */
const diedBefore = (p: PlayerInfo, deaths: DeathEvent[], start: number, t: number) =>
  deaths.some((d) => d.player === p.name && d.timestamp >= start && d.timestamp - DEATH_EVENT_LAG_MS < t - 500);


// ── Avoidable damage ────────────────────────────────────────────────────────

/** P6 hands out no Damage Down: Major only when the hit killed. */
function detectAvoidable(players: PlayerInfo[], life: Life, from: number, to: number): PullError[] {
  const errors: PullError[] = [];
  const ids = Object.keys(AVOIDABLE).map(Number);
  for (const p of players) {
    const hits = p.damageTaken.filter((e) => ids.includes(e.abilityId) && e.timestamp >= from && e.timestamp <= to && !bodyHit(e) &&
      life.hitAlive(p, e.timestamp) && (realAmount(e) > 0 || (e.amount ?? 0) >= PREVIEW_AMOUNT));
    for (const g of clusterByGap(hits, (e) => e.timestamp, 3000)) {
      const what = AVOIDABLE[g[0].abilityId];
      const died = life.diedFrom(p, g[g.length - 1].timestamp);
      const total = g.reduce((s, e) => s + realAmount(e), 0);
      errors.push(playerError(p, {
        ruleId: TOP6_AVOIDABLE_RULE_ID, severity: died ? "Major" : "Minor", name: `Hit by ${what.replace(/'s .*/, "")}`,
        description: `Hit by ${what} (${g.length > 1 ? `${g.length} hits, ` : ""}${total > 0 ? kFmt(total) : "lethal"}).${died ? " They died, losing Brilliant Dynamis and its Limit Break refund." : ""} ${AVOID_WHY[what]}`,
        timestamp: g[0].timestamp, abilityId: g[0].abilityId, abilityName: g[0].abilityName,
      }));
    }
  }
  return errors;
}


// ── Wave Cannon spreads ─────────────────────────────────────────────────────

type Spot = { bearing: number; r: number; dev: number };

function spotOf(p: PlayerInfo, e: PlayerEvent): Spot | undefined {
  if (e.x === undefined || e.y === undefined) return undefined;
  const bearing = compassBearingOf(e.x, e.y);
  const clocks = p.role === "DPS" ? DPS_CLOCKS : SUPPORT_CLOCKS;
  return { bearing, r: yalms(e.x, e.y), dev: Math.min(...clocks.map((c) => angularDistance(c, bearing))) };
}
const offSpot = (s: Spot | undefined) => !!s && (s.r < CENTRE_Y || s.dev > SPOT_DEG);
const spotText = (p: PlayerInfo, s: Spot) => s.r < CENTRE_Y
  ? `${p.name} stood ~${s.r.toFixed(1)} yalms from the boss, inside every line`
  : `${p.name} stood ~${s.dev.toFixed(0)} degrees off ${p.role === "DPS" ? "the DPS intercardinals" : "the support cardinals"}`;

/**
 * Each Wave Cannon set: four lines, each aimed at its target from the boss.
 * A line that hits anyone besides its target is an overlap. The players off
 * the NAUR clock (or in the middle) caused it; when nobody is, every player
 * in the overlap is a candidate.
 */
function detectSpreads(players: PlayerInfo[], life: Life, casts: EnemyEvent[], from: number, to: number): PullError[] {
  const errors: PullError[] = [];
  const all = casts.filter((c) => c.abilityId === SPREAD && c.timestamp >= from && c.timestamp <= to);
  for (const set of clusterByGap(all, (c) => c.timestamp, 300)) {
    const t = set[0].timestamp;
    const hits = liveHits(players, life, [SPREAD], t - 100, t + 1500).filter((h) => realAmount(h.e) > 0 || (h.e.amount ?? 0) >= PREVIEW_AMOUNT);
    // Targets of this set and the set paired with it: a line that lost its
    // target belongs to the victim no other line in the pair targeted
    // (J14 +68.7: the DRG's line, since the DRK was targeted 2s later).
    const pairTargets = new Set(all.filter((c) => Math.abs(c.timestamp - t) <= 3000 && c.target).map((c) => c.target!));
    const spotCache = new Map<PlayerInfo, Spot | undefined>();
    const spotAt = (p: PlayerInfo) => {
      if (!spotCache.has(p)) {
        const e = hits.find((h) => h.p === p)?.e;
        const pos = e ?? (() => { const q = interpolatePlayerPosition(p, t, { windowMs: 1500 }); return q ? { ...q } as PlayerEvent : undefined; })();
        spotCache.set(p, pos ? spotOf(p, pos) : undefined);
      }
      return spotCache.get(p);
    };
    const inCentre = (p: PlayerInfo) => (spotAt(p)?.r ?? Infinity) < CENTRE_Y;
    // Each overlapping line: who's involved, and who caused it.
    const lines: { involved: Set<PlayerInfo>; named: Set<PlayerInfo> }[] = [];
    for (const inst of uniq(hits.map((h) => h.e.sourceInstance))) {
      const victims = uniq(hits.filter((h) => h.e.sourceInstance === inst).map((h) => h.p));
      const cast = set.find((c) => c.sourceInstance === inst);
      let owner = byName(players, cast?.target ?? "");
      if (owner && !life.alive(owner, t)) owner = undefined;
      if (!owner) {
        const cands = victims.filter((p) => !pairTargets.has(p.name) && !inCentre(p));
        if (cands.length === 1) owner = cands[0];
      }
      const extras = victims.filter((p) => p !== owner);
      if (!extras.length || (!owner && victims.length < 2)) continue;
      const involved = new Set([...victims, ...(owner ? [owner] : [])]);
      // A player near the boss stands in every line: theirs alone (J7's WHM:
      // the DRG's own line clipped them, so the DRG's angle didn't matter).
      const centre = [...involved].filter(inCentre);
      const named = new Set<PlayerInfo>(centre);
      const rest = [...involved].filter((p) => !inCentre(p));
      if (extras.some((p) => !inCentre(p))) {
        const devOf = (p: PlayerInfo) => spotAt(p)?.dev ?? 0;
        const off = rest.filter((p) => offSpot(spotAt(p)));
        // Nobody past the line: the clearly worse angle when it's 10+ degrees
        // worse than everyone else's (J14: the DRG 18 vs the DRK 2), else all.
        const worst = [...rest].sort((a, b) => devOf(b) - devOf(a));
        const clear = worst.length >= 2 && devOf(worst[0]) - devOf(worst[1]) >= SPOT_MARGIN_DEG ? [worst[0]] : rest;
        (off.length ? off : clear).forEach((p) => named.add(p));
      }
      lines.push({ involved, named });
    }
    // Merge lines that share a player into one overlap.
    const merged: { involved: Set<PlayerInfo>; named: Set<PlayerInfo> }[] = [];
    for (const l of lines) {
      const hit = merged.filter((m) => [...l.involved].some((p) => m.involved.has(p)));
      const u = { involved: new Set([...l.involved, ...hit.flatMap((m) => [...m.involved])]), named: new Set([...l.named, ...hit.flatMap((m) => [...m.named])]) };
      merged.splice(0, merged.length, ...merged.filter((m) => !hit.includes(m)), u);
    }
    for (const m of merged) {
      const involved = [...m.involved];
      const spot = new Map(involved.map((p) => [p, spotAt(p)] as const));
      const named = [...m.named];
      const off = named.filter((p) => offSpot(spot.get(p)) || named.length < involved.length);
      const victimsHit = involved.filter((p) => hits.filter((h) => h.p === p).length > 0);
      const dead = victimsHit.filter((p) => hits.some((h) => h.p === p && life.diedFrom(p, h.e.timestamp)));
      const doubled = involved.filter((p) => hits.filter((h) => h.p === p).length >= 2);
      const why = off.length
        ? off.map((p) => { const s = spot.get(p); return s ? spotText(p, s) : `${p.name}'s position isn't logged`; }).join("; ") + " (read at the hit, so a player still on their way to their spot reads as off it)"
        : `nobody was clearly off their clock (${involved.map((p) => { const s = spot.get(p); return s ? `${p.name} ${s.dev.toFixed(0)} degrees, ${s.r.toFixed(1)}y out` : p.name; }).join("; ")}), so all are named`;
      const what = `Wave Cannon's spread lines overlapped on ${names(involved.map((p) => p.name))}${doubled.length ? ` (${names(doubled.map((p) => p.name))} took two lines)` : ""}: ${why}.`;
      for (const p of named) {
        errors.push(playerError(p, {
          ruleId: TOP6_SPREAD_RULE_ID, severity: dead.length ? "Major" : "Minor", name: "Wave Cannon Spread Overlap",
          description: `${what}${dead.length ? ` ${names(dead.map((d) => d.name))} died.` : ""} Each line runs from the boss through its target: supports spread to the cardinals and DPS to the intercardinals, well out from the boss, so no line crosses another player.`,
          timestamp: t, abilityId: SPREAD, abilityName: "Wave Cannon",
        }));
      }
    }
  }
  return errors;
}


// ── Wild Charge ─────────────────────────────────────────────────────────────

/**
 * Wild Charge shares one line among all eight, aimed out from the boss at a
 * player. A player standing off the party's line drags the line (or leaves
 * the share short): named. When nobody stood off it but living players
 * weren't hit, those players are named. Only judged with all eight alive:
 * after a death the pull is already lost (player in the fights, 2026-10-15:
 * K9nq Pull 7's charge with seven alive is moot).
 */
function detectCharges(players: PlayerInfo[], life: Life, deaths: DeathEvent[], casts: EnemyEvent[], start: number, to: number): PullError[] {
  const errors: PullError[] = [];
  for (const c of casts.filter((x) => x.abilityId === CHARGE && x.timestamp >= start && x.timestamp <= to)) {
    const t = c.timestamp;
    const hits = liveHits(players, life, [CHARGE], t - 100, t + 1500);
    if (!hits.length) continue;
    const alive = players.filter((p) => life.alive(p, t));
    if (alive.length < players.length) continue;
    const pos = new Map(alive.map((p) => {
      const e = hits.find((h) => h.p === p)?.e;
      if (e?.x !== undefined && e.y !== undefined) return [p, { x: e.x, y: e.y }] as const;
      return [p, interpolatePlayerPosition(p, t, { windowMs: 2500 })] as const;
    }));
    const far = alive.filter((p) => { const q = pos.get(p); return q && yalms(q.x, q.y) >= CHARGE_MIN_R_Y; });
    const bearings = far.map((p) => compassBearingOf(pos.get(p)!.x, pos.get(p)!.y));
    // The party's line: the bearing most players stand within 15 degrees of.
    const line = bearings.map((b) => ({ b, n: bearings.filter((o) => angularDistance(o, b) <= 15).length })).sort((a, b) => b.n - a.n)[0]?.b;
    const lateral = (p: PlayerInfo) => { const q = pos.get(p)!; return yalms(q.x, q.y) * Math.sin(angularDistance(compassBearingOf(q.x, q.y), line!) * Math.PI / 180); };
    const offLine = line === undefined ? [] : far.filter((p) => angularDistance(compassBearingOf(pos.get(p)!.x, pos.get(p)!.y), line) > 90 || lateral(p) > CHARGE_LATERAL_Y);
    const missed = alive.filter((p) => !hits.some((h) => h.p === p));
    const killed = uniq(hits.filter((h) => life.diedFrom(h.p, h.e.timestamp) && !diedBefore(h.p, deaths, start, t)).map((h) => h.p));
    const named = offLine.length ? offLine : missed;
    for (const p of named) {
      const off = offLine.includes(p);
      errors.push(playerError(p, {
        ruleId: TOP6_CHARGE_RULE_ID, severity: killed.length ? "Major" : "Minor", name: off ? "Off the Wild Charge Line" : "Missed the Wild Charge",
        description: `${off ? `Stood ~${lateral(p) > 50 ? "far" : lateral(p).toFixed(1) + " yalms"} off the party's Wild Charge line` : "Wasn't in Wild Charge's shared line"}: ${hits.length} of ${alive.length} living players shared it${missed.length && off ? ` (${names(missed.map((x) => x.name))} weren't hit)` : ""}.${killed.length ? ` ${names(killed.map((x) => x.name))} died.` : ""} Everyone stacks on one line behind the tanks so all eight split the charge.`,
        timestamp: t, abilityId: CHARGE, abilityName: "Wave Cannon (Wild Charge)",
      }));
    }
  }
  return errors;
}


// ── Flash Gale ──────────────────────────────────────────────────────────────

/**
 * Each volley is two Flash Gales: one on the enmity target, one on the
 * farthest player, each a 5y circle. In both reports the WAR holds the boss
 * at 4-7y and the DRK baits the far one at ~15y. Both tanks alive and two
 * or more non-tanks hit means a circle landed on the party. The tank it
 * missed owed it when a non-tank was the farthest player (J17 +81.9: the
 * DRK 8.8y out, inside the party; the DRG farthest at 11.1y).
 */
function detectGales(players: PlayerInfo[], life: Life, casts: EnemyEvent[], from: number, to: number, occurrences?: ReportedOccurrence[]): PullError[] {
  const errors: PullError[] = [];
  const tanks = players.filter((p) => p.role === "Tank");
  if (tanks.length !== 2) return errors;
  const all = casts.filter((c) => c.abilityId === FLASH_GALE && c.timestamp >= from && c.timestamp <= to);
  for (const vol of clusterByGap(all, (c) => c.timestamp, 500)) {
    const t = vol[0].timestamp;
    if (!tanks.every((p) => life.alive(p, t))) continue;
    occurrences?.push({ mechanicKey: TOP6_GALE_RULE_ID, timestamp: t, players: tanks.map((p) => p.name) });
    const hits = liveHits(players, life, [FLASH_GALE], t - 100, t + 1500);
    const others = uniq(hits.filter((h) => h.p.role !== "Tank").map((h) => h.p));
    if (others.length < 2) continue;
    const missed = tanks.filter((p) => !hits.some((h) => h.p === p));
    const dead = others.filter((p) => hits.some((h) => h.p === p && life.diedFrom(p, h.e.timestamp)));
    const what = `Flash Gale's circle landed on the party (${others.length} non-tanks hit${dead.length ? `; ${names(dead.map((p) => p.name))} died` : ""}).`;
    const fix = "One tank holds the boss close and the other stands farthest from it, both clear of the party, through both volleys.";
    const dist = new Map(players.filter((p) => life.alive(p, t)).map((p) => {
      const q = interpolatePlayerPosition(p, t, { windowMs: 2000 });
      return [p, q ? yalms(q.x, q.y) : undefined] as const;
    }));
    const farthest = [...dist].filter(([, d]) => d !== undefined).sort((a, b) => b[1]! - a[1]!)[0];
    const owed = farthest && farthest[0].role !== "Tank" ? missed : [];
    if (owed.length) {
      for (const p of owed) errors.push(playerError(p, {
        ruleId: TOP6_GALE_RULE_ID, severity: dead.length ? "Major" : "Minor", name: "Flash Gale on the Party",
        description: `${what} ${p.name} took neither gale: they stood ~${dist.get(p)?.toFixed(1) ?? "?"} yalms from the boss while ${farthest[0].name} was farthest at ~${farthest[1]!.toFixed(1)}, so the far gale went to the party. ${fix}`,
        timestamp: t, abilityId: FLASH_GALE, abilityName: "Flash Gale",
      }));
    } else {
      errors.push(playerlessMinor(TOP6_GALE_RULE_ID, "Flash Gale on the Party", `${what} ${missed.length ? "The far tank was still the farthest player" : "Both tanks were hit too"}, so the log can't say who stood wrong. ${fix}`, t, FLASH_GALE, "Flash Gale"));
    }
  }
  return errors;
}


// ── Magic Number ────────────────────────────────────────────────────────────

/** The Magic Number aura ran out on living players: no healer LB3 cleared it. */
function numberExpiry(players: PlayerInfo[], life: Life, deaths: DeathEvent[], casts: EnemyEvent[], start: number): PullError | undefined {
  for (const c of casts.filter((x) => x.abilityId === MAGIC_NUMBER && x.timestamp >= start)) {
    const expired: { p: PlayerInfo; t: number }[] = [];
    for (const p of players) {
      const ds = p.debuffs.filter((d) => d.abilityId === NUMBER_AURA && d.timestamp >= c.timestamp && d.timestamp <= c.timestamp + 4000).sort((a, b) => a.timestamp - b.timestamp);
      const on = ds.find((d) => d.debuffStatus === "applied");
      const off = on && p.debuffs.find((d) => d.abilityId === NUMBER_AURA && d.debuffStatus === "removed" && d.timestamp > on.timestamp);
      if (on && off && off.timestamp - on.timestamp >= NUMBER_EXPIRY_MS && life.alive(p, off.timestamp - 100)) expired.push({ p, t: off.timestamp });
    }
    if (!expired.length) continue;
    const t = Math.min(...expired.map((x) => x.t));
    const lbs = players.flatMap((p) => uniq(p.casts.filter((e) => e.timestamp >= start && e.timestamp <= t && LB3.has(e.abilityName)).map((e) => e.abilityName)).map((n) => ({ p, n })));
    const healers = players.filter((p) => p.role === "Healer");
    const healed = healers.filter((p) => lbs.some((l) => l.p === p && HEALER_LB3.has(l.n)));
    const lost = uniq(deaths.filter((d) => d.timestamp >= start && d.timestamp < c.timestamp).map((d) => d.player));
    return raidMarker(TOP6_MAGIC_NUMBER_RULE_ID, "Magic Number Not Cleansed",
      `Magic Number's aura ran out on ${names(expired.map((x) => x.p.name))} with no healer Limit Break to clear it, which kills them. Healer LB3s this phase: ${healers.map((p) => `${p.name} ${healed.includes(p) ? "used theirs" : "didn't"}`).join(", ")}. ${lost.length ? `Died earlier in P6 (each death loses Brilliant Dynamis and the LB refund it carries, which breaks the tank and healer LB chain): ${names(lost)}.` : ""} Unresolvable from here; treated as the cutoff point.`.replace(/\s+/g, " "),
      t, NUMBER_AURA, "Magic Number");
  }
  return undefined;
}

/**
 * The first P6 death ends the pull (player in the fights, 2026-10-15): the
 * dead player loses Brilliant Dynamis, its large damage reduction and its
 * Limit Break refund, so the tank and healer LB chain can't get through
 * both Magic Numbers. The planned DRK sacrifice is exempt: a tank who used
 * their tank LB3 earlier in P6 dying to Magic Number (L16, J14).
 */
function firstDeath(players: PlayerInfo[], deaths: DeathEvent[], called: Set<DeathEvent>, start: number): PullError | undefined {
  const sacrifice = (d: DeathEvent) => {
    const p = byName(players, d.player);
    return d.killingAbilityGameId === MAGIC_NUMBER && p?.role === "Tank" &&
      p.casts.some((e) => TANK_LB3.has(e.abilityName) && e.timestamp >= start && e.timestamp < d.timestamp);
  };
  const d = deaths.filter((x) => x.timestamp >= start && !sacrifice(x)).sort((a, b) => a.timestamp - b.timestamp)[0];
  if (!d) return undefined;
  if (called.has(d)) {
    const list = [...called].filter((x) => x.timestamp >= start).sort((a, b) => a.timestamp - b.timestamp);
    return raidMarker(TOP6_CALLED_WIPE_RULE_ID, "Wipe Called",
      `${names(list.map((x) => x.player))} died with no killing blow: the wipe was called and the raid reset into the deathwall.`,
      d.timestamp - DEATH_EVENT_LAG_MS, 0, "Deaths");
  }
  const id = d.killingAbilityGameId ?? 0;
  const ability = id ? byName(players, d.player)?.damageTaken.find((e) => e.abilityId === id)?.abilityName ?? `ability ${id}` : undefined;
  return raidMarker(TOP6_DEATH_RULE_ID, "Brilliant Dynamis Lost",
    `${d.player} died (${ability ?? "no killing blow"}), losing Brilliant Dynamis: its damage reduction and its Limit Break refund are gone, and a raise doesn't bring them back, so the LB chain through both Magic Numbers can't be completed. Treated as the cutoff point.`,
    d.timestamp - DEATH_EVENT_LAG_MS, id, ability ?? "Death");
}


// ── Deaths with no killing blow ─────────────────────────────────────────────

/**
 * Called-wipe deaths: three or more together, or any near the pull end with
 * no mechanic death after. A Walking Dead running out (a DRK's invuln left
 * unhealed) and the Magic Number aura's expiry deaths aren't resets.
 */
function calledWipeDeaths(players: PlayerInfo[], deaths: DeathEvent[], pullEnd: number): Set<DeathEvent> {
  const silent = deaths.filter((d) => {
    if (d.killingAbilityGameId) return false;
    const p = byName(players, d.player);
    const fatal = d.timestamp - DEATH_EVENT_LAG_MS;
    return !p?.debuffs.some((x) => (x.abilityId === WALKING_DEAD || x.abilityId === NUMBER_AURA) && x.debuffStatus === "removed" && Math.abs(x.timestamp - fatal) <= 1000);
  });
  const out = new Set<DeathEvent>();
  for (const d of silent) {
    const mechAfter = deaths.some((k) => k.killingAbilityGameId && k.timestamp > d.timestamp);
    if (pullEnd - d.timestamp <= CALLED_WIPE_END_MS && !mechAfter) out.add(d);
    const near = resetCluster(silent.filter((x) => Math.abs(x.timestamp - d.timestamp) <= CALLED_WIPE_WINDOW), deaths);
    if (near.length >= CALLED_WIPE_COUNT) near.forEach((x) => out.add(x));
  }
  return new Set(resetCluster([...out], deaths));
}


// ── Entry point ─────────────────────────────────────────────────────────────

/**
 * Phase 6 (Alpha Omega), from Cosmo Memory to the pull's end. Only the
 * earliest mechanic Raid is kept; a generic cutoff only before it.
 */
export function detectAlphaOmegaErrors(
  players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], occurrences?: ReportedOccurrence[],
): PullError[] {
  const start = enemyCasts.find((c) => c.abilityId === COSMO_MEMORY)?.timestamp;
  if (start === undefined) return [];
  const end = Math.max(0, ...players.flatMap((p) => [...p.damageTaken, ...p.casts].map((e) => e.timestamp)), ...enemyCasts.map((c) => c.timestamp));
  const life = buildLife(players, deathEvents);
  const p6Deaths = deathEvents.filter((d) => d.timestamp >= start);
  const casts = enemyCasts.filter((c) => c.timestamp >= start - 1000);

  const errors: PullError[] = [
    ...detectAvoidable(players, life, start - 1000, end),
    ...detectSpreads(players, life, casts, start, end),
    ...detectCharges(players, life, deathEvents, casts, start, end),
    ...detectGales(players, life, casts, start, end, occurrences),
  ];

  // The cutoff: the first P6 death, or Magic Number running out with
  // nobody dead yet, whichever came first.
  const raids = [
    firstDeath(players, p6Deaths, calledWipeDeaths(players, p6Deaths, end), start),
    numberExpiry(players, life, deathEvents, casts, start),
  ].filter((x): x is PullError => !!x).sort((a, b) => a.timestamp - b.timestamp);
  if (raids.length) errors.push(raids[0]);
  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
