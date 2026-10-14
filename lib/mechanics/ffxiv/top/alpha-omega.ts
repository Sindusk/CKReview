// The Omega Protocol (Ultimate) -- Phase 6: Alpha Omega.
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
