// The Omega Protocol (Ultimate) -- Phase 4: Blue Screen / Final Omega.
//
// -- GUIDE-DERIVED MODEL (2026-10-14; NOT VERIFIED AGAINST LOGS) --
// Comment-only research; no detector or registration. Every proposed
// failure signal is guide-inferred. Original 6.31 Ultimate script,
// sync 635; no confirmed mechanic-changing hotfix found. Job/gear updates
// make launch LB and DPS advice patch-sensitive rather than requirements.
//
// -- SOURCES CHECKED 2026-10-14 --
// [IV] Lavender/Meru, original threshold and spread/stack guide:
// https://www.icy-veins.com/ffxiv/the-omega-protocol-ultimate-phase-4-guide
// [EL] Tuufless, south stacks, flex priority, mitigated solo-tank option:
// https://ffxiv.tuufless.com/elemental/top/04_blue_screen/
// Author source read: github.com/tuufless/FFXIV-Elemental-Raid-Macros,
// main/_elemental/top/04_blue_screen.en.md.
// [TH] LPDU South Safe, afterimage lines, ring timing:
// https://thaliak.com/ultimates/top/
// [CB] Timed phase and distinct wave visuals:
// https://github.com/quisquous/cactbot/blob/main/ui/raidboss/data/06-ew/ultimate/the_omega_protocol.txt
// [BM] Candidate action mappings and line geometry:
// https://github.com/awgil/ffxiv_bossmod/blob/master/BossMod.Ultimate/Endwalker/Ultimate/TOP/TOPEnums.cs
// Same directory P4WaveCannon.cs read. Action IDs are decimal game IDs,
// not verified FFLogs ability mappings. "Wave Cannon" spans several
// different actions in this phase and in P1/P5/P6.
//
// -- SHAPE, HEALTH AND CLOCK --
// After P3 reaches 0 HP, the same boss reboots to 100% [IV/EL].
// Three rounds of eight protean spreads, their delayed afterimages and
// two line stacks per round. Wave Repeater overlaps rounds 2 and 3.
// Blue Screen checks boss HP at its resolution. Passing advances to P5;
// boss does not need to be killed. No ongoing energy/resource mechanic.
// CB offsets from P3-end/P4 anchor (600 is artificial, not pull time):
// +7.1 targetable; +21.4 spread 1, +26.7 afterimage, +27.0 stack 1;
// +29.4/+31.5/+33.5/+35.5 first Repeater set;
// +31.5 spread 2, +36.6 afterimage, +36.8 stack 2;
// +41.6 spread 3, +46.7 afterimage, +46.9 stack 3;
// +46.6/+48.6/+50.6/+52.6 second Repeater set;
// +61.6 Blue Screen completes, then untargetable.
// Actual uptime is ~54.5s, explaining EL's "55-second" description;
// TH's ~63s whole phase is not the same clock origin.
// Distinguish begincast, visual execution, damage and HP test; targetable
// time and previous phase duration vary with kill speed.
//
// -- WAVE CANNON: PROTEAN SPREADS AND AFTERIMAGES --
// Candidates: first protean damage 31614; delayed protean ground
// cast/damage 31616 (~5.3s cast); visual controller 31617, follow-up
// visuals 31618/32534/31619/31620. None is automatically the stack hit.
// What happens: all eight players receive a line from the boss;
// Magic Vulnerability Up prevents safely taking overlapping lines.
// The eight aimed lanes are repeated ~5s later, concurrently with stacks.
// Geometry [BM]: 100y long, 6y wide rectangles originating at center.
// A protean is aimed through a player; its victims are not necessarily
// its intended baiter. Delayed casts may carry aim/rotation, not owner.
// Correct play: eight distinct angles, leaving stack lanes unbaited.
// Wait for initial spread even if stack markers are already visible;
// then move to separate stack lanes. Return to original spread angles
// before round 2/3; flex for a stack does not change one's next bait.
// Failure modes:
//   Early stack -> LOG SIGNAL: simultaneous 31614 hits on a cluster,
//     vulnerability/Damage Down/deaths; FAULT: early-moving player(s)
//     if known; CONSEQUENCE: Major plus Raid for missing next bodies.
//   Spread overlap -> LOG SIGNAL: multiple 31614 events on a player;
//     FAULT: wrong assigned bait angle rather than automatically victim;
//     CONSEQUENCE: Major for Damage Down/death, Minor if neither.
//   Afterimage crosses stack -> LOG SIGNAL: 31616 hits during 31615,
//     earlier lane aimed through stack sector; FAULT: baiter failed to
//     return to original angle or stack moved into old bait lane, by
//     raid plan; CONSEQUENCE: Major, Raid if whole stack is killed.
// Removal: vulnerability expires between required hits; delayed lanes
// disappear on their scheduled resolution. A telegraph still on the
// ground is not proof of an additional targeting snapshot.
// Death retargeting and whether one dead baiter leaves fewer or randomly
// repeated proteans are not established by the read guides.
// Not errors: one spread per player per round, repeated empty lanes,
// standing temporarily in a future lane before leaving for its hit.
//
// -- WAVE CANNON: TWO SHARED LINE STACKS --
// Candidates: stack-target visual 22393 (not itself damage);
// shared line damage 31615 (100y long/6y wide [BM]).
// What happens: two random marked targets, usually two four-player
// line shares. Six stacks across phase; 24 initial protean bait events
// and 24 afterimage lanes, not a single eight-person stack mechanic.
// Correct play: one marker per group, each person shares exactly one
// line while dodging the repeated spread lanes. Stack targets determine
// directions, not tank enmity. If both marks are one side, exchange a
// marked player and a balancing member of the opposite side.
// EL spots before stacks, N->S on each half:
//   tank, ranged, healer, melee; west LP1 / east LP2, south kept empty.
// On double-marked side lower/southmost marked player crosses; opposite
// side melee crosses back. Four per side remains true. Stack lanes are
// distinct south-west/south-east angles, not two groups on true south.
// TH likewise sends southern marked player and opposite southern player.
// Exact yalm/marker placement is plan-dependent; 6y line width requires
// each group to align behind its own marked player.
// Failure modes:
//   Missing share -> LOG SIGNAL: fewer intended 31615 recipients with
//     increased split damage/deaths; FAULT: absent sharer if known;
//     CONSEQUENCE: Major when lethal, Raid when next sequence fails.
//   Both stacks on same lane -> LOG SIGNAL: doubled 31615 hits and
//     vulnerability/Damage Down/deaths; FAULT: failed marked-player
//     exchange or mis-aimed stack by plan; CONSEQUENCE: Major plus Raid.
//   Wrong balancing swap -> LOG SIGNAL: one three-player and one
//     five-player line, isolated intended member; FAULT: missed exchange
//     if the plan is known; CONSEQUENCE: Major if lethal, not a generic
//     blame on the three surviving members.
// Removal: marks disappear at resolution; no cleanse/dispel task.
// Guides do not settle whether a marked death immediately fires a line,
// moves its marker or simply removes the required target.
// Not errors: expected shared damage, 4:4 exchange, a planned tank solo.
// EL explicitly allows a marked tank to take a north line solo under
// mitigation (~210k launch damage) while the other group shares. This
// is evidence against treating every <4-recipient line as a hard fail.
// IV additionally describes both tanks sharing one north line, leaving
// six players in the other south line. Two/six is also a valid plan.
// Correctly positioned stack deaths from raw damage are mitigation or
// healing failures, not evidence that those victims missed mechanics.
//
// -- WAVE REPEATER OVERLAPS --
// Candidates reused from P3: 31567/31568/31569/31570. First pulse
// circle 0-6y; subsequent rings 6-12y, 12-18y, 18-24y [BM].
// What happens: two four-pulse sequences, in rounds 2 and 3; eight
// pulses total. P3's lethal center transition zone is not part of the
// described P4 arena, so moving through center later is legitimate.
// Correct play: resolve spread/stack at radius safe for current pulse;
// step into just-cleared ring, then out as required. Round 2 first pulse
// precedes spreads and final pulse precedes stacks. Round 3 first pulse
// occurs around stacks: remain at safe stack radius, move in afterwards.
// Failure modes:
//   Ring hit -> LOG SIGNAL: 31567..31570 damage, Damage Down/death;
//     FAULT: late/early radial movement if position available;
//     CONSEQUENCE: Major for Damage Down/death, Minor if neither.
//   Dodge displaces bait -> LOG SIGNAL: next protean aimed at a stack
//     lane after wrong return path; FAULT: wrong baiter if established;
//     CONSEQUENCE: Major/ Raid at affected volley, not two duplicate
//     accusations for the same originating mistake.
// Removal: each pulse ends immediately; no lingering ring debuff.
// Not errors: stepping into the cleared center, crossing boss hitbox
// after stacks, movement that does not match floor-ring outlines.
//
// -- BLUE SCREEN: PASS DAMAGE VERSUS WIPE PENALTY --
// Candidates: visual 8s cast 31611; successful raidwide 31612;
// failed HP-check raidwide 31613 (different helper damage actions [BM]).
// What happens: at scripted completion boss must be below 20% [EL/TH].
// Success still deals raidwide damage; failure kills the party. A
// completed Blue Screen cast happens in successful pulls too.
// Correct play: meet threshold before test, heal/mitigate success damage.
// Failure -> LOG SIGNAL: failed version 31613 / no subsequent P5
// transition and boss HP above threshold; FAULT: raid DPS check, no
// specific player inferable from this event; CONSEQUENCE: Raid.
// Removal: phase change retires/reconfigures boss after resolution;
// exact clearing of surviving HW debugger buffs is not proven here.
// Not errors: successful 31612 damage, waiting for timed transition,
// keeping late P3 DoTs on the revived actor, using or holding an LB.
//
// -- STRATEGY AGREEMENT / WHAT ENDS A PULL --
// IV/EL/TH agree on three spread->afterimage+two-stack rounds, separated
// stacks, two Repeater sequences and an HP check rather than a kill.
// South Safe is a common arrangement, not a mandatory world direction.
// Solo-tank lines alter normal recipient counts; east/west alternatives
// would alter safe bait angles. The static's actual plan is unknown.
// IV plans P3 LB3 then P4 LB1, or P4 LB3 with different buff carryover;
// EL commonly opens P4 LB3; TH calls LB3 strongly required. These are
// patch/composition-dependent damage plans, not mechanical obligations.
// Hard cutoff is failed Blue Screen. Earlier double-hit/stack deaths
// normally destroy subsequent shares; mark inevitability only when
// requirements actually cannot be recovered. Called walls are resets.
//
// -- OPEN QUESTIONS / SOURCE DISAGREEMENTS FOR LOG VERIFICATION --
// 1. Exact HP comparator: below 20%, <=20%, or a rounded display? Is HP
//    tested on 31611 completion or the following helper hit? Verify pass
//    31612 versus fail 31613 and phase transition delay.
// 2. Do initial/afterimage/stack damage really map 31614/31616/31615?
//    CB labels visual 31617/32534 etc as Wave Cannon A/B; distinguish
//    those control actions from actual player damage.
// 3. Are <4 stacks pure damage scaling, or any separate penalty?
//    Verify EL's solo-tank exception and chosen mitigation plan.
// 4. Confirm vulnerability duration, Damage Down per avoidable, death
//    retargeting of marks/proteans and ability-less wall/reset deaths.
// 5. TH timeline shows five Repeater entries in places; CB and EL show
//    four-stage pulses. Are extra entries visuals/duplicate hits or a
//    genuine fifth pulse? Also resolve 55s uptime versus ~62s whole phase.
// 6. Does revived actor retain enmity/DoTs/debuggers across P3/P4?
//    Which event reliably delimits P4 before the P5 transition?
