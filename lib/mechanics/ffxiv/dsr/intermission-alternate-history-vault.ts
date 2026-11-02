// lib/mechanics/ffxiv/dsr/intermission-alternate-history-vault.ts
//
// -- DIGEST --
// DSR Ultimate rewind, AFTER the first Eyes phase; not the original P1
// prison. Research only, extending Terra's model. Tank LB3 at Haurchefant's
// arrival enables his survival/healing; keep him alive through spear pulses,
// four Brightwing pairs / Skyblind drops and HP-scaled Pure of Heart.
// Then destroy the now-targetable spear before its 11s Pierce completes.
// Failure can LOOP TO P2 rather than immediately wipe. True-route failure
// is still terminal for this attempt to reach P5/P7. First-history NPC death
// is expected and must never be classified as a failed rescue.
// Sections: "SCOPE AND SOURCES", "SHAPE AND CLOCK", "LOG AND SEVERITY",
// "PRISON AND TANK LIMIT BREAK", "NPC HEALING AND SHOCKWAVES",
// "BRIGHTWING AND SKYBLIND", "PURE OF HEART", "SPEAR AND PIERCE",
// "PULL ENDERS", "STRATEGY AND NOT ERRORS", "OPEN QUESTIONS".
// Main unknowns: LB-to-NPC interaction, friendly actor/heal visibility,
// healing-block status, death/drop semantics, route events and HP scaling.
// -- END DIGEST --
//
// -- SCOPE AND SOURCES --
// Ultimate only, checked 2026-11-02. No logs or static assignments supplied.
// [IV] https://www.icy-veins.com/ffxiv/dragonsongs-reprise-ultimate-guide-for-eyes
// [T] Saving Haurchefant section:
// https://ffxiv.tuufless.com/elemental/dsr/04_eyes/
// [NA] https://naurffxiv.com/ultimate/dsr
// [U] https://ultistrats.com/guides/dsr/
// [M] https://materiaraiding.com/ultimate/dsr
// [B] DSW2Enums.cs, DSW2States.cs, P4Intermission.cs, and shared DSW1
// PureOfHeart.cs, independent action/geometry descriptions:
// https://github.com/awgil/ffxiv_bossmod/tree/master/BossMod.Ultimate/Endwalker/Ultimate/DSW2
// https://github.com/awgil/ffxiv_bossmod/tree/master/BossMod.Ultimate/Endwalker/Ultimate/DSW1
// [C] https://raw.githubusercontent.com/quisquous/cactbot/main/ui/raidboss/data/06-ew/ultimate/dragonsongs_reprise_ultimate.txt
// [W] https://consolegameswiki.com/wiki/Dragonsong%27s_Reprise_(Ultimate)
// Release 6.11. Official release and 2024-07-02 freezing fix are linked in
// P1; no rescue-specific numerical hotfix established. Modern Charibert HP
// pushes do not eliminate the need to save NPC / kill spear. Damage amounts
// from older gear are not thresholds. Candidate decimal actions, not FFLogs
// GUID verification, are listed below.
//
// -- SHAPE AND CLOCK --
// Eyes defeated -> narrative rewind -> west-side prison. Knights do not
// repeat their whole opener. Charibert attacks as in P1 while Haurchefant
// intercepts Zephirin's spear. This time the party has tank LB3 available.
// Correct rescue + spear defeat -> Haurchefant success / P5 Incarnation.
// Failed rescue -> original outcome / P2 loop, not a new checkpoint.
// [C] EFFECT clock from Planar Prison, rounded:
// 00:00 prison / Pure begins; 00:10 Spear of the Fury;
// 00:16/21/26/31 Brightwing pairs; 00:24/29/34/39 Skyblind hits;
// 00:36 Pure of Heart; ~00:38 spear targetable;
// ~00:41 Pierce starts; ~00:52 Pierce completion deadline.
// The last Skyblind overlaps the move to spear. Script is timed until
// kill-dependent spear finish. Exact NPC arrival and LB buff window must
// be measured; "as he appears" is the community cue, not a measured offset.
//
// -- LOG AND SEVERITY --
// The same prison/cone/Pure names and IDs recur in P1 and failed loops.
// Post-Eyes context, a successful rescue event and the following phase
// distinguish histories. Friendly NPC HP/heal/death may be absent in a
// player's saved view; no missing heal alone establishes healer failure.
// Attributable Damage Down/death is Major; other avoidable nonlethal damage
// is Minor. Raid includes an established failed true-route attempt even if
// characters survive into P2. Victims of bad cones/drops are not necessarily
// offenders. An anonymous route failure is preferable to guessed healer blame.
//
// -- PRISON AND TANK LIMIT BREAK --
// What: Planar Prison 25313 pulls/stuns party and confines it near west side.
// Boundary effect 25580 is separate from initial expected pull damage.
// Spear of the Fury 25314 has ~10s cast. Haurchefant's normal state prevents
// effective healing; sources describe tank LB3 as removing/avoiding this
// healing block while reducing spear damage. Exact status mechanism unverified.
// Correct: reserve THREE LB bars for this event. One assigned tank uses
// LB3 after Haurchefant enters, before spear hits. Tank LB3 action names:
// Last Bastion, Land Waker, Dark Force, Gunmetal Soul (job-dependent).
// The NPC interaction is encounter-specific; do not assume every other
// party mitigation reaches a friendly NPC in the same way.
// Failure: no/late/too-early LB3 -> LOG SIGNAL: no covering LB3 buff/cast,
// unmitigated spear/Shockwave family, failed rescue/loop; FAULT: LB tank only
// if designated and bars/timing known, otherwise unknown; CONSEQUENCE: Raid
// once failed rescue is established. Cast presence alone does not prove
// correct timing or NPC coverage. LB1/LB2 is not the standard rescue solution.
// Failure: prison exit -> LOG SIGNAL: boundary damage/death; FAULT: mover
// unless forced; CONSEQUENCE: Major. Leaving to target the spear is safe
// only after prison ends. Removal: confinement ends with script, not dispel.
// Not errors: prison pull, one tank consuming LB3, initial spear impact,
// no tank LB on the original first-history prison.
//
// -- NPC HEALING AND SHOCKWAVES --
// What: Haurchefant is a friendly healing target and must survive until
// spear defeat. Shockwave 25315 is the ordinary/unmitigated candidate;
// 25368 is a separate mitigated Shockwave candidate in [B]. Repeated pulses
// occur roughly every 1.1s while spear remains. Pulses are sourced from the
// SPEAR, not evidence that Haurchefant is attacking party members.
// Correct: target-heal NPC continuously as needed, top him for Pure, and
// sustain party through ongoing pulses. Healers can trade NPC healing/baits;
// not every raid heal/personal shield is assumed to affect the NPC.
// Failure: NPC falls behind/dies -> LOG SIGNAL: NPC HP/damage/death if
// available, then failed rescue route; FAULT: prior damage/LB issue or group
// healing until specific assignments and heals prove otherwise;
// CONSEQUENCE: Raid for failed route. An absent heal from one healer does
// not identify an omission while that healer resolves assigned baits.
// Removal: pulses stop on spear/NPC/script state, not a cleanse. Haurchefant
// death is not a planned sacrifice here. Not errors: sustained pulse hits
// in a successful rescue, heavy single-target healing of a non-party actor.
//
// -- BRIGHTWING AND SKYBLIND --
// What: four waves of TWO nearest-player cones, Brightwing 25369; not a
// two-person split stack. Each intended hit applies Light Resistance Down
// and Skyblind (candidate status 2661). Expiry places a delayed ~3y circle;
// actual Skyblind explosion 25370 is ~8s after cone, ~2.5s after ground
// cast begins [B]. Last explosion occurs after Pure, near spear opening.
// Correct: rotate four distinct pairs; next baits become closest, previous
// pair moves to drop side then off its snapshot. Keep cones separate and
// away from resting party/NPC-healer positions while remaining inside ring.
// Failure: repeat/clip -> LOG SIGNAL: another cone under Light resistance
// or extra recipients, vulnerability/death; FAULT: late departing pair,
// wrong approaching pair or misplaced cone only when positions establish
// it, otherwise unknown; CONSEQUENCE: Major on death.
// Failure: bad drop / standing in drop -> LOG SIGNAL: Skyblind hit/Damage
// Down/death; FAULT: bad placer if circle blocks valid safe space, intruder
// if placement correct, otherwise unknown; CONSEQUENCE: Minor, Major with
// Damage Down/death. Removal: expiry is successful drop, no dispel;
// early/death-time trigger and replacement targets remain unestablished.
// Not errors: eight intended cones, eight circles, last drop after Pure,
// alternating bait sides, tank pair taking last cone while healers heal NPC.
//
// -- PURE OF HEART --
// What: Charibert's 25316, ~35.5-36s cast, raid damage dependent on his HP.
// Guides use ~30% remaining HP as a practical safety goal. It is not a
// verified hard pass/fail boundary or the HP he must be killed to. This hit
// also threatens Haurchefant; party survival alone does not establish rescue.
// Correct: damage Charibert, top party/NPC, apply the chosen mitigation.
// Once his damage is sufficiently reduced, holding resources for spear is
// valid; he may become HP-locked rather than require a normal kill.
// Failure -> LOG SIGNAL: Pure damage plus player/NPC deaths and remaining
// Charibert HP; FAULT: group damage/mitigation/healing or established earlier
// mistake, not automatically an individual healer; CONSEQUENCE: Raid on
// terminal collapse/failed rescue. Surviving high damage is not by itself
// evidence of poor play. Removal: cast finishes normally, prison clears.
// Not errors: Pure damage, Charibert remaining alive, deliberate resource
// holds that still satisfy survival and spear check.
//
// -- SPEAR AND PIERCE --
// What: ONE Spear of the Fury becomes targetable after Pure. Pierce 26971
// is an ~11s cast directed at Haurchefant; completion kills him. It is an
// objective to destroy, not an assumed interruptible enemy spell.
// Correct: switch from Charibert to spear, use reserved burst, finish before
// Pierce. Haurchefant's PierceSuccess 25367 is a candidate success cue;
// subsequent P5 Incarnation is independent evidence of the correct route.
// Failure: spear survives -> LOG SIGNAL: completed Pierce, NPC death and/or
// returning P2 Mercy instead of P5; FAULT: raid damage check, player-less
// unless a proven assigned omission exists; CONSEQUENCE: Raid for true route.
// Removal: spear defeat cancels Pierce and stops its pulse sequence.
// Not errors: Pierce begincast, switching early to spear, canceled cast,
// successful burst/LB choices that retain the required rescue LB timing.
//
// -- PULL ENDERS --
// Failed initial protection, NPC death to pulses/Pure, or completed Pierce
// prevents P5 continuation. The game may loop to P2 rather than kill party.
// A route failure is not owned by a later P2 mechanic. Brightwing/exit
// losses can also cause terminal collapse. The similar FIRST-history
// Haurchefant death belongs to P1 and is never this failure.
//
// -- STRATEGY AND NOT ERRORS --
// NA commonly HMRT (healers, melee, ranged, tanks), alternating boss-relative
// E/W drops. Other rotations/front-back routes remain valid. Each pair
// baits once, every circle is cleared, NPC healing and spear burst continue.
// Either tank can LB3; community job priorities coordinate who presses, they
// are not game requirements or the user's assignments. Calling LB timing
// from NPC arrival, dialogue or calibrated local clock is a choice.
// Heavy NPC healing, pulses while he lives, intentional Charibert holds and
// damage directed at spear are normal. No healer-specific failure inferred.
//
// -- OPEN QUESTIONS --
// 1. Which NPC actor HP/heal/death and LB buffs are available? What exact
//    healing-block status changes, at which event, and does LB affect pulses?
// 2. Measure NPC arrival -> spear damage and LB duration; can no LB, late LB
//    and insufficient LB bars be distinguished without a group assignment?
// 3. Verify Pure HP scaling/player-vs-NPC damage, Charibert HP lock, final
//    Skyblind overlap and spear targetability/Pierce timing.
// 4. What happens to Skyblind/cones on death, and can bad placement be
//    separated from an intruder using source/ground coordinates?
// 5. Which success/failure route events distinguish this rescue, original
//    prison and later P2 loops? Fetch a successful rescue and LB/NPC/Pierce
//    failures for build verification; user logs/assignments remain absent.
