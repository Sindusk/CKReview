// lib/mechanics/ffxiv/fru/pandora.ts
//
// -- GUIDE-DERIVED MODEL: PANDORA (FRU PHASE 5) --
// Futures Rewritten (Ultimate), patch 7.11 origin; checked 2026-10-09.
// Comment-only research. No real report verified; ALL proposed log signals
// and attribution below are hypotheses. Shared contract: fatebreaker.ts.
// roomates.ts owns duo/crystal failure and bad-ending cause; P5 has no
// checkpoint. Death/penalty here threatens tight damage check but is not
// automatically an inevitable wipe if a specific recovery remains possible.
// Damage Down is Major for a proven root player; Raid marks terminal loss.
//
// -- SOURCES AND CURRENT STRATEGY --
// [N] Tvnariea Reksane's original mechanical explanation:
//     https://naurffxiv.com/ultimate/fru/guide/p5
// [S] Ro Lo's original NAUR phase-five presentation linked from WTFDIG:
//     https://slides.com/ultiproject/frup5/scroll
// [W] Selected current NAUR role board:
//     https://wtfdig.info/ultimates/fru#naur
// [L] LPDU's own current assignments sourced from Fijou:
//     https://lpdu.net/fru/p5/
// [ME] MUR Fulgent Blade original diagrams:
//      https://raidplan.io/plan/xE5dM62WDf6sYUYf
// [MW] MUR wing/tower original diagrams:
//      https://raidplan.io/plan/Bf91HcD3ckk_S-Lw
// [MP] MUR Polarizing original diagrams:
//      https://raidplan.io/plan/ca2GGs51v5uKGpz1
// [I] Tor's original explanation, 2024-12-12:
//     https://www.icy-veins.com/ffxiv/futures-rewritten-ultimate-guide-for-phase-5-pandora
// [C] Original Cactbot timeline, candidate ACT/game IDs only:
//     https://github.com/OverlayPlugin/cactbot/blob/main/ui/raidboss/data/07-dt/ultimate/futures_rewritten.txt
// [T] Original timeline by A'rhaeda Vhil:
//     https://thaliak.com/ultimates/fru/
// No mechanic-changing hotfix established. Current NAUR, LPDU and MUR all
// use Tank/Melee/Ranged/Healer Polarizing order; I's Tank/Healer/Melee/Ranged
// recommendation is a valid older alternate, not the current user baseline.
// Shared geometry cannot reliably identify a whole-fight regional preset.
//
// -- PHASE SHAPE, RESOURCE AND CLOCK [I, C] --
// True P5 requires P2 necklace and P4 memory crystal preservation. Long
// cutscene/Down for the Count then Pandora targetable; bad Guardian route
// instead immediately uses Paradise Lost. Those are different actor/gates.
// Circular deathwall, dual autos on top-two enmity; tanks establish first/
// second immediately. No ordinary adds to kill or passive boss energy.
// Order: Fulgent/Akh -> Wings -> Polarizing -> Box -> Fulgent/Akh -> Wings
// -> Polarizing -> Fulgent/Akh -> Paradise Lost. Two full cycles, third
// stops after Fulgent. Second cycle faster, not a new phase.
// Approximate offsets from targetability [T], damage not cast start:
// 00:11 Fulgent; 00:38 Akh; 00:56 Wings; 01:17 Polarizing;
// 01:52 Box; 02:04 Fulgent; 02:53 Wings; 03:09 Polarizing;
// 03:35 Fulgent; 04:02 Akh; 04:32 final enrage.
// Box requires reserved party LB; enrage grants ~1.5 bars midcast for late
// melee LB3. That resource changes by scripted gift, not a boss HP trigger.
// Boss defeat before final completion clears; enrage completion is Raid.
// No player attribution from a damage-check failure alone.
//
// -- FULGENT BLADE: THREE PAIRS OF EXALINES, THREE OCCURRENCES [ME, N] --
// Physical raidwide, six light/dark lines forming three crossing pairs,
// origins offset 45 degrees; first outer pair, middle, last outer pair,
// direction CW/CCW. Each line advances perpendicular to origin, eight
// pulses; pairs overlap in time. Only first pulse has omen; later safe
// movement follows exploded strips, not a new marker every pulse.
// Standard dodge: between outer Xs, offset away from first; after second
// pulse enter intersection diamond half farthest from next X, repeat for
// middle/last. Final whole diamond safe once no next pair remains.
// Variants can rotate frame/use different cleared pockets; valid movement
// is determined by actual wave geometry, not marker name or region label.
// Failure: line hit -> LOG: The Path of Light/Darkness damage, Damage Down
//   and same-element Resistance Down II ~15s; FAULT: mover with geometry
//   evidence; CONSEQUENCE: Major even if healed. Following expected attack
//   may kill through that resistance debuff: one cause, not two errors.
// Removal: resist/down expire; status removal on death is not an avoided
// pulse. No carrier explosion is described for either debuff.
// Not errors: Fulgent raidwide, traveling through already-resolved strips.
//
// -- AKH MORN AFTER EACH FULGENT [I, L] --
// One light stack on random player at Pandora's left, one dark at right,
// boss-relative, not compass-relative. Facing locks during cast. Empty
// side can redirect target to other side; random target is not tank aggro.
// One hit per group here, unlike P4's volley. No extra minimum-count Mark
// penalty described; fewer helpers still increases split damage [N].
// NAUR/LPDU/MUR G1 left/light, G2 right/dark. Cross hitbox-center indicator
// enough to be clearly on chosen side; some party follows last exaline to
// reach flank. Prior exaline resistance makes corresponding stack lethal.
// Failure: groups overlap/empty side -> LOG: both elemental hits on same
//   group, abnormal split or death; FAULT: side/target controller if branch
//   and positions prove it; CONSEQUENCE: Major, Raid if unrecoverable.
// Failure: dual-auto non-tank -> LOG: top-two auto death; FAULT: established
//   enmity controller when trace proves it; CONSEQUENCE: Major.
// Not errors: two expected LP hits and auto damage on protected tanks.
//
// -- PARADISE REGAINED: THREE TWO-PLAYER TOWERS [MW, L, N] --
// Towers S/NW/NE in random appearance order; resolve in that order. First
// tower becomes RELATIVE south, rotate entire plan. Healers first, G1 DPS
// relative NW/left, G2 DPS NE/right. Each two-player tower inflicts ~7s
// magic vuln, preventing another tower/tether during its lockout.
// Wings first+second element plus tether resolve with first+second towers;
// third tower alone. Sequence is tower THEN wing THEN tether, not perfectly
// simultaneous. Moving on wing animation alone can double-hit a tether.
// Wing is PHYSICAL 225-degree cleave, front+corresponding wing side, aimed
// at first-enmity tank; Physical Vulnerability Up ~4s prevents consecutive
// wing hits. Other players hit get Damage Down. Swap enmity DURING cast;
// second target locks late. Element does not imply magical cleave damage.
// Distance tether excludes current wing tank: light farthest, dark nearest;
// retargets automatically as distances change, not a passable tether.
// Tether buster magic with ~4s magic vuln; tank wing/tether duties exchange
// after first hit. Different damage types allow each tank one of each.
// Dark first: MT relative NW/tower line to aim dark away; OT closest in.
// Light first: MT relative NE/tower line; OT far out. Party dark OUT/light
// IN. OT provokes, moves to opposite angle for second cleave; MT takes new
// distance tether. DPS move into own tower after first complete resolution.
// Heal/mitigate heavily; invuln + external tank mitigation is valid. Group's
// tank identity may reverse without changing solve; cooldown plan matters.
// Failure: missing/extra tower -> LOG: Explosion penalty/raid Damage Down;
//   FAULT: missing assigned living soaker if demand/source known;
//   CONSEQUENCE: Major; Raid if terminal. Six intended soaks are normal.
// Failure: wrongly aimed wing -> LOG: non-target wing Damage Down/death;
//   FAULT: aiming tank or misplaced victim if source ray/rotation known;
//   CONSEQUENCE: Major. Nearest victim coordinates do not establish aim.
// Failure: failed duty swap -> LOG: second physical hit under phys vuln or
//   second tether under magic vuln; FAULT: enmity/distance controller if
//   established; CONSEQUENCE: Major. Externally protected survival is valid.
// Failure: DPS/healer steals distance tether -> LOG: buster on non-tank;
//   FAULT: competing distance player or tank bait if positions prove it;
//   CONSEQUENCE: Major, Raid on lost tower/group.
// Removal: short vulnerabilities expire; first tether holder could take
// final tower after its shorter lockout [N], a valid custom recovery.
// Not errors: intended wing/tether busters, tower hits and invuln strategies.
//
// -- POLARIZING STRIKES / PATHS: FOUR VOLLEYS, TWICE [MP, L] --
// Boss facing locks. Two LP line stacks on opposite element sides, light
// left/dark right; closest player in each line receives element Resistance
// Down II ~16s. Roughly 2s later original lanes explode: all dodge away.
// Three subsequent Polarizing Paths repeats: four paired stacks + four
// avoidable afterblasts. Actual lane is wider than visual effect [N].
// NAUR/LPDU/MUR: G1 left rear flank, G2 right rear flank. Front/side-swap
// order T -> M -> R -> H. Each front player crosses to opposite party after
// own hit while others dodge. Final healer still dodges afterblast. Different
// valid THMR/other declared permutation changes ownership, not mechanic.
// Tanks try face north beforehand, but geometry follows actual boss facing;
// second cycle lacks convenient autoattack reorientation window [N].
// Failure: wrong front/repeated element -> LOG: same resistance holder front
//   again or same-element hit/death under Resistance Down; FAULT: wrong
//   front player/swap controller with priority evidence; CONSEQUENCE: Major.
// Failure: afterblast -> LOG: delayed line damage + Damage Down;
//   FAULT: mover unless another group's mis-aimed line clipped them;
//   CONSEQUENCE: Major. Late origin snapshots must be measured.
// Removal: resist expires after sequence; waiting for expiration is not
// sufficient during four volleys. No automatic front-holder death splash
// documented. Missing helper increases stack risk, not proof of fault.
// Not errors: eight intended lines, front resistance debuffs, valid swaps.
//
// -- PANDORA'S BOX, FINAL LIMIT BREAK AND WIPE CUTOFF [I, L] --
// Box once: enormous raid damage requiring tank LB3 plus party mitigation.
// NAUR/LPDU mnemonic near the "d" in cast name/Transcend your limits; actual
// remaining seconds/buff coverage needs logs, not UI-letter hardcoding.
// Tank LB2 with unusually heavy mitigation is documented possible by I;
// success is not an error merely because LB3 was absent. LB party resource
// is shared; assigned tank presses it, others save gauge before check.
// Failure: absent/mistimed protection -> LOG: Box damage/deaths outside
//   tank-LB buff coverage; FAULT: assigned LB tank or earlier gauge spender
//   only if plan/timing prove it; CONSEQUENCE: Major plus Raid if party lost.
// Final Paradise Lost long cast grants LB gauge; assigned melee must use
// LB3 promptly to land before completion. Missing LB may be a damage-check
// cause, but not proven fault without gauge availability/assignment evidence.
// Not errors: Box raidwide under protection, tank LB downtime, melee LB.
// Bad-ending Paradise Lost belongs to prior necklace/crystal failure; final
// Pandora enrage is distinct. Down for the Count cutscene is compulsory.
//
// -- CANDIDATE ACTION ANCHORS AND LOG-VERIFICATION QUESTIONS --
// C game hex: 9D72 Fulgent ability; 9D80 tower Explosion damage;
// 9D81 candidate Unmitigated Explosion penalty;
// 9D86 Box ability; 9D88 final Paradise Lost ability. Decimal FFLogs mapping,
// resolving vs controller IDs and penalty IDs remain unverified.
// 1. Are side-stack membership, front Resistance recipients and tower
//    recipients captured enough to learn TMRH vs other orders? Current
//    NAUR/LPDU/MUR share these choices: they are compatible candidates, not
//    independently identifiable labels. Strategy may need manual override.
// 2. Do captured boss facing/source positions establish relative frame and
//    wing aimer, tower order, proximity tether ownership and duty swap?
//    Distinguish dynamic correct rotation from a bad fixed-compass move.
// 3. Verify each resolving/penalty ID, initial/follow-up lane, buster damage
//    types, vuln windows, immunity behavior, stack splitting and LB coverage.
//    Confirm one-hit P5 Akh rather than importing P4's volley count.
//    Which Cruel Path/Polarizing Paths IDs are stacks versus afterblasts?
// 4. Does failed tower expose separate Unmitigated Explosion or same-name
//    Explosion scope? What actual game/FFLogs IDs represent the final gauge
//    gift and tank LB buff? What determines first/second wing lock times?
// 5. Measure safe diamonds, lane widths/steps, marker-relative tower spots,
//    nearest/farthest snapshot tolerances and late LB landing deadline.
//    Identify earliest terminal loss versus recoverable death/output penalty,
//    and intentional resets; later casualties can be the first hit's fallout.
