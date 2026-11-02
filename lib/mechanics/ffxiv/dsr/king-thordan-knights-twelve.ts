// lib/mechanics/ffxiv/dsr/king-thordan-knights-twelve.ts
//
// -- DIGEST --
// DSR Ultimate P2, the sole checkpoint: initial Mercy/Might, Strength,
// Quaga/Heel/Might, Sanctity (Sever/dashes/gazes then meteors/towers),
// Ultimate End, two Broad Swings, Aetheric Burst. Research only; no FFLogs
// verification or detector. Extends the initial Terra model.
// Strength has SIX one-person towers, not eight; Sanctity has TWO sets of
// EIGHT. Seven comet placements per each of two Prey = fourteen total.
// Mercy Concealed is bait-then-dodge, not eight intentional damage soaks.
// Failure names: Eternal Conviction for missed tower; Holy Impact for comet
// collision; separate helper hits for raid controllers. Three-hit Might and
// four Sacred Sever hits are expected. Early kill can skip late swings.
// Strategy variants include DRK-relative/absolute group sorting, role flex,
// different meteor quadrants/routing and tower priorities, tank invulns.
// No group plan supplied. A missing tower's assignee is usually unknowable.
// Sections: "SCOPE AND SOURCES", "SHAPE AND CLOCK", "LOG AND SEVERITY",
// "MERCY AND TANK COMBOS", "STRENGTH: LINES, RINGS AND LIGHTNING",
// "STRENGTH: LEAPS, STACK, TETHERS AND TOWERS",
// "SANCTITY: SACRED SEVER, GAZES AND DASHES",
// "SANCTITY: ICE, FIRE, COMETS AND TOWERS", "ULTIMATE END AND BROAD SWING",
// "PULL ENDERS", "STRATEGY AND NOT ERRORS", "OPEN QUESTIONS".
// Main verification needs: tower penalty scope, comet snapshots, target
// markers/facing availability, proximity scaling, early-push clock changes.
// -- END DIGEST --
//
// -- SCOPE AND SOURCES --
// Ultimate only. Checked 2026-11-02; all failures are research hypotheses,
// including those described as lethal. No kill/wipe report used here.
// [IV] https://www.icy-veins.com/ffxiv/dragonsongs-reprise-ultimate-guide-for-king-thordan
// [T] https://ffxiv.tuufless.com/elemental/dsr/02_thordan/
// [R] https://ffxiv.tuufless.com/mana/dsr/differences/
// [NA] https://naurffxiv.com/ultimate/dsr
// NA diagrams (actual assignment references, not a selected static plan):
// https://raidplan.io/plan/NDX-6bF2djrDMB-v
// https://raidplan.io/plan/2CYKJu6IHzBdolZu
// https://raidplan.io/plan/Src8CpFxCAUUuZEM
// [APD] https://ultimates.guide/dsr/
// [B] DSW2Enums.cs, DSW2States.cs, DragonsGaze.cs, HeavyImpact.cs,
// P2StrengthOfTheWard1/2.cs, P2SanctityOfTheWard1/2.cs,
// P2BroadSwing.cs and P2Discomposed.cs, independent game-event reference:
// https://github.com/awgil/ffxiv_bossmod/tree/master/BossMod.Ultimate/Endwalker/Ultimate/DSW2
// [C] https://raw.githubusercontent.com/quisquous/cactbot/main/ui/raidboss/data/06-ew/ultimate/dragonsongs_reprise_ultimate.txt
// [W] https://consolegameswiki.com/wiki/Dragonsong%27s_Reprise_(Ultimate)
// Released 6.11, 2022-04-26. No P2 numerical hotfix established. P1 source
// list links official release and the 2024-07-02 freezing fix (mainly P6).
// Job/gear changes and voluntary holds alter pushes and cooldown readiness.
// Candidate geometry is game-reference geometry, not measured log tolerance.
//
// -- SHAPE AND CLOCK --
// King Thordan and knight/eye helpers. Circular arena, lethal perimeter.
// Thordan's HP is locked until the scripted late vulnerability window; huge
// damage does not skip the two major downtime sequences. Ultimate End applies
// Discomposed (candidate status 2733), increasing damage taken by Thordan.
// P2 defeat -> Nidhogg; a later wipe returns here, not P1. A failed rewind
// can also return to another P2 instance within the same overall attempt.
// [C] Anchor 00:00 = FIRST Mercy Concealed effect, not checkpoint pull start.
// Might 00:03/05/06; Strength 00:17; Lightning/Thrust/first ring ~00:30;
// Mercy again 00:35; last ring 00:38; Collapse/Rage 00:45;
// Leaps/Bash/Bladedance ~00:46-49; six towers 00:50; Quaga 00:58;
// Heel 01:08, Might ~01:11-15; Sanctity 01:26;
// Sever/gazes ~01:39, remaining Sever hits ~01:41/43/45;
// ice/fire 01:57; first eight towers 01:59; seven comet waves 02:03-11;
// knockback/second eight towers 02:12; return ~02:20;
// Ultimate End ~02:33; Broad Swing sequences ~02:45/02:54;
// Aetheric Burst completes ~03:05. Scripted sequence; boss death ends it.
// Some guide clocks instead start at targetability, roughly 11s earlier.
// Timings are rounded research anchors, not observed windows. Comet-running
// spacing is player-controlled; no earned-energy mechanic in this phase.
//
// -- LOG AND SEVERITY --
// IDs below: candidate DECIMAL game actions from [B], not verified FFLogs
// GUIDs. Cast/controller, helper damage and player statuses are distinct.
// Minor = avoidable damage without death/Damage Down; Major = attributable
// Damage Down/death/caused loss; Raid = terminal failure, may be player-less.
// No assignments supplied: group, tower, Prey swap and tank duties are not
// derivable from job alone. Markers, gaze facing and tethers may not log.
// The damaging event records the victim, not necessarily the line aimer.
// Routine stack/soak vulnerabilities expire; they are exposure, not mistakes.
// Unrecoverable fallout after a failed tower is not eight independent errors.
// Wall deaths may have no useful ability; knockback, Hysteria and deliberate
// recovery walls after Damage Down are different causes of that same result.
//
// -- MERCY AND TANK COMBOS --
// What: auto candidate 25531 cleaves around the top enmity target.
// Ascalon's Mercy Concealed 25544 is a 3s controller cast; helper 25545
// is the avoidable directional hit. Each player baits a ray/cone, normally
// combined into tight party baits, then moves after the direction snapshots.
// Ascalon's Might 25541: THREE large frontal cleaves, ~1.6s apart.
// Heavenly Heel 25543: 4s heavy single-target buster, Slashing Resistance
// Down; subsequent Might requires a swap or a suitable invulnerability plan.
// Correct: face autos/busters away; stack bait Mercy behind, then sidestep.
// Strength's Mercy is also baited/dodged, after Lightning Storm has resolved.
// Failure: Mercy hit -> LOG SIGNAL: helper damage/Damage Down/death; FAULT:
// victim for late dodge, misplaced baiter only when line geometry proves it;
// CONSEQUENCE: Minor, Major with Damage Down/death. Failure: cleave/swap ->
// LOG SIGNAL: extra Might/auto victims or lethal Might on Heel recipient;
// FAULT: bad facing/failed swap if enmity and plan establish it, otherwise
// unknown; CONSEQUENCE: Major if caused death, Raid if terminal collapse.
// Removal: resistance expires; a swap changes enmity, not the debuff. Not
// errors: three intended Might hits, mitigated Heel, invulning the full combo.
//
// -- STRENGTH: LINES, RINGS AND LIGHTNING --
// What: Strength 25555 controller. Three knights charge opposite sides via
// Spiral Thrust 25556, candidate 16y-wide lines. Two opposite safe sectors
// remain. Guerrique is OFF-CENTER; his position, not arena center, is the
// origin for five Heavy Impact regions, 25558-25562. [B] radii: initial 6y
// circle, then 6-12, 12-18, 18-24, 24-30y rings, ~1.9s between effects.
// Lightning Storm 25548 controller, 25549 personal ~5y damage circles on
// all eight, coinciding with charges/first quake. Mercy bait follows.
// Correct: light parties spread within the two safe sectors for lightning,
// then enter previously cleared quake regions. Collapse into controlled
// Mercy baits only after lightning; sidestep Mercy and continue to phase two.
// Failure: line/ring -> LOG SIGNAL: Thrust/Impact damage, Stun, Damage Down
// or death; FAULT: mover unless forced there; CONSEQUENCE: Minor, Major
// with Damage Down/death. Failure: lightning overlap -> LOG SIGNAL: more
// than one's own personal effect plus associated vulnerability/death;
// FAULT: misplaced spread if identifiable, otherwise unknown; CONSEQUENCE:
// Major on death/Damage Down. A lone intended lightning hit is not failure.
// Removal: all telegraphed strikes resolve once; transient penalties expire.
// Not errors: eight own lightning hits, moving through already cleared rings,
// different safe-sector choices, intentional loss of uptime to dodge.
//
// -- STRENGTH: LEAPS, STACK, TETHERS AND TOWERS --
// What: three non-tanks receive Skyward Leap 25565 (~24y circles). Three
// other non-tanks have no blue mark; an unmarked player is the Dragon's Rage
// target (25550 controller, 25551 ~8y shared effect). Two knight tethers are
// intercepted by tanks for Bash 25297 -> Bladedance 25299, same family as P1.
// Dimensional Collapse 25563 controller / 25564 growing ground explosions
// constrain movement. Six Conviction towers: controller 25566, success
// 25567, missed-tower penalty Eternal Conviction 25568. Candidate radius 3y.
// Correct: use Thordan's edge position as relative N. Blue marks split
// W/E/S, with E/W slightly toward S for tank clearance. Three unmarked
// non-tanks stack at N; tanks stretch the two tethers to either side of them.
// Rage is commonly shared by all five before Bash isolates the tanks.
// Tanks are stunned/busy during towers; SIX non-tanks each soak ONE.
// Blue marks step into W/E/S towers; the three former stack players claim
// the three N towers by conga/left-middle-right priority.
// Failure: Leap/Collapse clips -> LOG SIGNAL: extra Leap recipients or
// Collapse damage/death; FAULT: wrong bait/position if proven; CONSEQUENCE:
// Major on death, or Minor without death/Damage Down.
// Failure: tether stolen, too short, or cleaving stack -> LOG SIGNAL: final
// Bash target, distance-dependent hit, extra Bladedance victims/deaths;
// FAULT: interceptor or player crossing tether only if known; CONSEQUENCE:
// Major, Raid if terminal. The original non-tank tether is normal targeting.
// Failure: under-shared Rage -> LOG SIGNAL: small share and death; FAULT:
// absent assigned helper if known, otherwise unknown; CONSEQUENCE: Major
// only with attribution; terminal group failure may be Raid/player-less.
// Failure: empty tower -> LOG SIGNAL: Eternal Conviction, missing tower
// success, raid damage/Damage Down; FAULT: assignee unknown without plan;
// CONSEQUENCE: Major if attributed Damage Down/death, Raid if unrecoverable.
// Removal: tethers resolve to busters, stuns/vulns expire, Collapse clears.
// Not errors: Rage share, own Leap, six successful tower hits, tank busters.
//
// -- SANCTITY: SACRED SEVER, GAZES AND DASHES --
// What: Sanctity 25569. Two players receive sword markers 1/2. Zephirin
// performs FOUR Sacred Sever 25571 split hits, alternating 1,2,1,2. His
// travel between separated groups reduces damage; this is not four hits
// on each marker. Two PLD knights execute Shining Blade 25570 and leave
// Brightsphere explosions Bright Flare 25295. Initial knight facing sets
// CW/CCW route. Dragon's Gaze controller 25552 -> helper 25553 and
// Dragon's Glory 25554 are independent gazes from Thordan and the Eye.
// Correct: two groups of four, one sword marker in each. First marker is
// normally opposite Zephirin, second near his starting side, maximizing
// initial travel. Sort groups, face away from BOTH gaze origins, then
// rotate with the dash pattern through already exploded orbs. Delay into
// a cleared blast region, never chase a still-active orb. [B] models orb
// radius 9y and dash width 6y; safe-path timing depends on knight pattern.
// Failure: group mis-sort / short Sever -> LOG SIGNAL: lethal small share
// or excessive damage with short source-target travel; FAULT: unknown
// without markers/plan, or proven misplaced marker; CONSEQUENCE: Major
// with attribution, Raid if terminal. Four hits total are expected.
// Failure: gaze -> LOG SIGNAL: Hysteria and gaze hit, potentially wall
// death afterward; FAULT: facing player unless already controlled;
// CONSEQUENCE: Minor or Major with Damage Down/death. Hysteria removal
// after death does not prove correct facing.
// Failure: dash/orb -> LOG SIGNAL: Blade/Flare damage/Damage Down/death;
// FAULT: mover unless driven there by prior gaze; CONSEQUENCE: Minor,
// Major with Damage Down/death. Removal: markers finish, auras expire,
// each orb explodes once. Not errors: four shared Sever hits, opposite
// group rotations, role flexes that move a player out of their light party.
//
// -- SANCTITY: ICE, FIRE, COMETS AND TOWERS --
// What: two Prey marks are both on supports OR both on DPS, not necessarily
// the same individual job class. Four Hiemal Storm pairs place ice regions:
// 25574 controller, 25575 ~7y impact. Heavens' Stake 28590 controller has
// four intercardinal ~7y fires 28591 plus outer donut 28592. Frostbite /
// Burns are persistent ground-hazard search terms, not intended raid ticks.
// First Conviction: 29563 controller, 29564 ~3y successful tower effects;
// EIGHT actual towers chosen from inner/outer candidate locations, NOT all
// sixteen possible coordinates. Outer options are around 18y from center;
// inner options around 6y [B]. Each needs one. Meteor role takes outer
// towers; others fill remaining outside/inside according to the plan.
// Holy Comet controller 25576; TWO Prey runners each drop SEVEN comets,
// ~1.4s apart. 25577 is ordinary comet damage; Holy Impact 25578 is collision
// failure. [B] estimates link distance ~5y, not a verified detector threshold.
// Runners should neither double back through earlier drops nor approach the
// other runner's trail. First comet position is linked to starting tower.
// Second Conviction: 28650 controller, 28651 successes; EIGHT outer towers
// at eight compass directions. Faith Unmoving 25308 overlaps the resolution.
// Correct: start in four support/DPS pairs for ice, split to first towers,
// run opposite comet routes with consistent direction, finish in second
// towers. Typical runners travel a half-circle and end opposite their
// starting quadrant. Inner players ride knockback toward second towers;
// already-outer players can use immunity. All must avoid ice/fire and wall.
// Failure: bad comet spacing -> LOG SIGNAL: Holy Impact/raid deaths,
// preferably preceding comet origins; FAULT: misplaced runner if proven,
// otherwise player-less; CONSEQUENCE: Raid when terminal.
// Failure: missed first/second tower -> LOG SIGNAL: Eternal Conviction
// candidate or missing success + penalty; FAULT: no assumed assignee;
// CONSEQUENCE: Raid if terminal; otherwise attributable Major for penalty.
// Failure: ice/fire contact -> LOG SIGNAL: extra ground damage, Frostbite/
// Burns, Damage Down/death; FAULT: mover or bad ice placer with evidence;
// CONSEQUENCE: Minor, Major with Damage Down/death. Failure: KB overshoot ->
// LOG SIGNAL: Faith then boundary death; FAULT: starting position or immunity
// failure if established; CONSEQUENCE: Major. A surviving Prey death may
// interrupt/retarget later comets: outcome is not established by this model.
// Removal: Prey resolves after its drops; ground hazards persist until
// sequence cleanup. Their disappearance/death removal is not a successful
// tower. Not errors: paired Hiemal damage, seven placements each, sixteen
// total successful tower soaks across two sets, controlled knockbacks.
//
// -- ULTIMATE END AND BROAD SWING --
// What: Ultimate End visual 25533, actual unavoidable raid hit 25534. The
// knight sequence ends, Thordan gains Discomposed and becomes finishable.
// Broad Swing controllers 25536/25537 select right-left-back or
// left-right-back sequence; actual helper 25538 is a ~120-degree sector.
// TWO sequences, three sectors each, with ~1s between hits. [B] places
// effects ~0.8/1.8/2.8s after cast finish. These are not simultaneous cones.
// Correct: mitigate/heal Ultimate End, then begin behind and step into the
// side already swept before the back attack. Identify each new cast branch.
// Failure: wrong sector/timing -> LOG SIGNAL: Broad Swing damage, Damage
// Down/death/knockback; FAULT: mover unless forced; CONSEQUENCE: Major with
// Damage Down/death, Minor otherwise. Failure: raidwide death -> LOG SIGNAL:
// Ultimate End hit/HP loss; FAULT: group healing/mitigation or prior cause,
// not automatically healer; CONSEQUENCE: Raid only if terminal.
// Removal: Discomposed is an ENEMY debuff, not a player mistake. Not errors:
// Ultimate End damage, deliberate damage holds for P3 cooldowns, skipped
// Broad Swing or canceled enrage when Thordan dies first.
//
// -- PULL ENDERS --
// Aetheric Burst 25539: 6s cast, terminal completion. Failed comet/tower
// sequences or sustained losses can end the pull first. Cast start is not
// failure; boss can still be killed. A death or Damage Down is not inherently
// unrecoverable, and later-phase cooldown holds can be intentional.
//
// -- STRATEGY AND NOT ERRORS --
// Strength sectors may be assigned by numbered/letter markers or N/W versus
// S/E halves. Tank/healer positions inside the lightning triangle differ
// between Tessan/OCE/NA plans. Tank tether crossing is common; Mana's
// uncrossed plan is another documented choice. Either must meet distance.
// DRK-relative Sanctity uses Zephirin as orientation; role counterparts swap
// when a sword belongs in the opposite group. Other plans use true E/W and
// a designated flex role to rebalance. "Daylights", "Brainsmort" and "DRK
// relative" labels may bundle different details; a label alone is no macro.
// Meteor plans fix Prey N/S, E/W, or prefer one axis with exceptions for
// cursed tower layouts. CW/CCW routing, center-first or side-first outer
// priorities, synchronized swaps and nearest/CW inner priorities all vary.
// A "cursed" short starting separation is a routing problem, not a different
// mechanic; slowed movement/different start within tower can be deliberate.
// Role-wide outer assignment includes the two UNMARKED members of Prey role.
// Standard tank swap, solo invuln Heel/Might, crossed or uncrossed tethers,
// immunity or riding Faith, and shared damage are valid plan choices.
//
// -- OPEN QUESTIONS --
// 1. Map actual FFLogs controllers, damage and aura GUIDs, including all
//    three tower-success families and Eternal Conviction in both Sanctity sets.
// 2. What exact penalties follow under/over-soaking, and which are survivable
//    in current gear? Which tower source/coordinates identify the failed one?
// 3. Confirm comet drop snapshot, growth/collision delay, separation threshold
//    and Prey death retargeting. Is runner ownership visible after actor spawn?
// 4. Are sword/Prey markers, knight facing, gaze directions and tether transfers
//    available in saved reports? What can be attributed without a static plan?
// 5. Measure Sever distance scaling, ordinary comet damage and HP lock release;
//    verify late script/early kill timing from a kill and failed mechanic pulls.
// 6. How are checkpoint starts and a post-rewind second P2 actor distinguished?
