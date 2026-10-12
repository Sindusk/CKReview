// lib/mechanics/ffxiv/fru/pandora.ts
//
// Futures Rewritten Phase 5 (Pandora) per-pull rules. Entry point:
// detectPandoraErrors. Self-gates on Pandora's casts and Fulgent Blade;
// runs from her first cast to the pull's end or Paradise Lost landing
// (enter-the-dragon.ts stops at the transition). The fallback model
// (fallback.ts MODULE_PHASES) stays out of P5.
//
// -- VERIFIED AGAINST LOGS (2026-10-12) --
// 37 pulls that reached P5 (three clears), no VODs, no raid plan. Mostly
// one static (same core roster in every report). Captures: A refetched to
// the pull end with `--refetch --fight ... --min-minutes 10.15
// --from-minutes 6.9`; B-J `--min-minutes 14.1 --from-minutes 13.5`:
//   A bMKCyQ6WR3zANaZn (A3/A4/A5/A9/A10/A11), B dDar482XvFKBPJYh (B1,
//   clear B3), C DWbAwTGQrYznK1jL (clear C17), D wY9h1862A3gXbFxm (D6,
//   clear D10), E 6LDbHyVCMR8NGBmA (E4/E7/E14/E16), F afM1vAgQ8TJt6Z9C
//   (F5/F10/F15/F16), G 63qFTt84PyC9mk1w (G8-G10), H 24VjdWDMgxmAJF9v
//   (H1/H5/H7/H9/H13), I dav8ATqVfzFNnG3M (I3/I8/I12), J H8gtKRVTxfjGLzbN
//   (J1/J4/J6/J11).
// Cited as G8 +50.1: pull, seconds after the first Fulgent Blade cast
// (14:20-14:29 into the pull, ~8s after Pandora's first auto).
// Clock (every pull within ~0.5s): Fulgent Blade +0 (raidwide +0.8),
// exaline hits +13.8..+23.9, Akh Morn +26.8 (hits +27.3), Paradise
// Regained +35.1, wings +45.5/+49.3, tethers +46.4/+50.1, towers
// +45.6/+49.1/+52.6, Polarizing Strikes +66.7 (volleys +67.3/+71.9/+76.5/
// +81.1, lanes ~2s after each), Pandora's Box +100.9 (hits +103.3),
// Fulgent +113.1, Akh Morn +139.9, Paradise Regained +152.4, Polarizing
// +178.7, Fulgent +203.8, Akh Morn +230.6, Paradise Lost 40327 +251.0 then
// 40328 landing +261.3. The model's order holds; one Akh hit per group.
// Log IDs (cactbot candidates checked by name and stream):
// - Fulgent Blade 40306 (cast and raidwide). Exaline casts 40118/40307
//   (first pulses) and 40308/40309; only The Path of Light 40308 / of
//   Darkness 40309 damage players: Damage Down plus Light / Dark
//   Resistance Down II (1004164 / 1003323, 16s).
// - Akh Morn 40310 (Pandora) with 40311 (light) / 40312 (dark) on four
//   each. Pandora's dual autos 40115 on her top two; Attack 40114 hits no one.
// - Paradise Regained 40319; first-wing variants 40313 / 40233; the
//   cleaves 40314 / 40315 (physical, Physical Vulnerability Up 1002940
//   4s, no Damage Down on anyone); the tethers 39879 / 39880 (magical,
//   Magic Vulnerability Up 1002941 4s). Towers: Explosion 40320 (two
//   players, Magic Vulnerability Up 7s); under-soaked Unmitigated Explosion
//   40321 on everyone, Damage Down.
// - Polarizing Strikes 40316, Polarizing Paths 40234 (x3). Cruel Path of
//   Light 40317 / Darkness 40318 are the line stacks (the front player
//   gets that Resistance Down II); 40119 / 40120 the lanes exploding
//   (Damage Down plus the resistance). Never hit anyone in a clear.
// - Pandora's Box 40326; every one landed under a tank LB3 (Last Bastion /
//   Gunmetal Soul ~3s before, on all hits' buffs). Paradise Lost 40327 is
//   cast at +251 (its HP: clears 6.2-7.6%, enrage wipes 9.5-17.1%), the
//   enrage 40328 at +261; in clear B3 40328 completed as Pandora died and
//   its hits were previews with no damage. The melee LB3 (Chimatsuri)
//   went in at +253-257 in every pull that reached it.
// Model questions the log answered:
// - Clean pattern, all three clears: exalines dodged (D10 took one),
//   Akh Morn four and four (MT with G1 left/light), the invulnerable tank
//   on the first wing and the other tank on its tether, swapping for the
//   second; healers on tower 1, a DPS pair on each of 2 and 3; T, M, R, H
//   front order in Polarizing with every front player crossing sides.
// - All 24 players who took an Akh Morn holding that element's resistance
//   (always from an exaline) died; holders who joined the other element's
//   stack lived (A10 +140.1, G8 +27.0, H13 +26.9/+140.1).
// - Every Unmitigated Explosion followed a soaker's death (E16, F5, F16,
//   G8-G10, H13, J6): none was a living player skipping a tower.
// - Lone non-tanks in a wing were third-tower DPS already standing on their
//   tower (1.0-2.7 yalms from its center) as the second wing went off (E16,
//   G8, G9, G10; E4 the second tower before the first wing).
// - A wing on four or more non-tanks killed them every time (A9, E7, F10,
//   F16, J6). Both tanks in one wing: D6 (the tether tank took it, the
//   target was invulnerable) and E4 (the reverse).
// - Fulgent Blade's raidwide after Box killed four in F15 and H5 (healing,
//   not a mechanic).
// Cutoffs (first Raid error) of the 34 non-clears: enrage 8 (A10, A11,
//   D6, H7, H9, I12, J1, J11), collapse 9, wings 5, Akh Morn 3 (A3, H1,
//   J4), Cruel Path 3 (A5, B1, E14), Unmitigated Explosion 3 (E16, G9, H13).
//   No pull came back from four dead; three survived 38-58s (A5, F15, I8).
//   Wipes with nobody named before the cutoff: A9 and J4-style group
//   misreads (a wing on the party, both Akh Morns on one group), B1 (both
//   Cruel Paths on one group) and H5 (Fulgent's raidwide after Box).
//
// -- RULES IMPLEMENTED --
// ffxiv-pan-exaline (Major, Damage Down): every exaline hit, one per player
//   per Fulgent Blade; notes when its resistance then made a stack lethal.
// ffxiv-pan-akh-morn: with all alive, a player in neither stack (Major when
//   the short stack killed someone), one or two players in both, both
//   stacks on one group (the one or two living players in neither are
//   named, else player-less); Raid when it killed 4+.
// ffxiv-pan-autos: Pandora's auto on a non-tank names the tank who took
//   neither (not before the first Fulgent, not a tank raised in the last
//   60s). Exposure: the tanks.
// ffxiv-pan-wings: a non-tank in the wing's cleave (Major on a death; notes
//   a later tower they stood on); 4+ is player-less plus Raid when it
//   killed 4+. Exposure: the non-tanks.
// ffxiv-pan-tank-wings: both tanks in one wing, both named.
// ffxiv-pan-tether: the tether's buster on a non-tank with both tanks alive
//   (not one the wing just hit). Exposure: the non-tanks.
// ffxiv-pan-tower (Major): a living non-tank in no tower when one went off
//   short; Raid when Unmitigated Explosion killed 4+.
// ffxiv-pan-polarizing: with all alive, players in both lines (3+ is
//   player-less), a player in a line of the element they hold a resistance
//   for (not from an avoidable hit); Raid when a volley killed 4+.
// ffxiv-pan-afterblast (Major, Damage Down): an exploding lane; 4+ at once
//   is player-less.
// ffxiv-pan-box: Box with no tank LB on any hit (player-less); Raid when
//   it killed 4+.
// ffxiv-pan-wall (Major): a no-killing-blow death that isn't a reset.
// ffxiv-pan-enrage (Raid, Pandora's HP at Paradise Lost's first cast),
// ffxiv-pan-called-wipe / -collapse (Raid; four dead).
// The Damage Down causes are excluded from ffxiv-damage-down (error-rules.ts).
// Not built: who aims a wing (party cleaves are player-less), the tether
// tank's distance, duty swaps beyond both-tanks-in-one-wing, raidwide
// deaths (Fulgent after Box), boss facing, the limit break gauge.
//
// -- GUIDE-DERIVED MODEL: PANDORA (FRU PHASE 5) --
// Futures Rewritten (Ultimate), patch 7.11 origin; checked 2026-10-09.
// Comment-only research. No real report verified; ALL proposed log signals
// and attribution below are hypotheses. Shared contract: fatebreaker.ts.
// enter-the-dragon.ts owns duo/crystal failure and bad-ending cause; P5 has no
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

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import type { ReportedOccurrence } from "@/lib/mechanics/occurrences";
import { kFmt, joinNames, playerError, playerlessMinor, raidMarker, clusterByGap } from "@/lib/mechanics/wow/common";
import {
  DAMAGE_DOWN, DEATH_EVENT_LAG_MS, type Hit, type Life,
  buildLife, hitsOf, castsOf, uniq, namesOf, isTank, realAmount, allAlive, byPlayer,
} from "./common";

export const PAN_EXALINE_RULE_ID     = "ffxiv-pan-exaline";
export const PAN_AKH_MORN_RULE_ID    = "ffxiv-pan-akh-morn";
export const PAN_AUTOS_RULE_ID       = "ffxiv-pan-autos";
export const PAN_WINGS_RULE_ID       = "ffxiv-pan-wings";
export const PAN_TANK_WINGS_RULE_ID  = "ffxiv-pan-tank-wings";
export const PAN_TETHER_RULE_ID      = "ffxiv-pan-tether";
export const PAN_TOWER_RULE_ID       = "ffxiv-pan-tower";
export const PAN_POLARIZING_RULE_ID  = "ffxiv-pan-polarizing";
export const PAN_AFTERBLAST_RULE_ID  = "ffxiv-pan-afterblast";
export const PAN_BOX_RULE_ID         = "ffxiv-pan-box";
export const PAN_WALL_RULE_ID        = "ffxiv-pan-wall";
export const PAN_ENRAGE_RULE_ID      = "ffxiv-pan-enrage";
export const PAN_CALLED_WIPE_RULE_ID = "ffxiv-pan-called-wipe";
export const PAN_COLLAPSE_RULE_ID    = "ffxiv-pan-collapse";

// ── log IDs (VERIFIED above) ────────────────────────────────────────────────

const PANDORA_NAME      = "Pandora";
const FULGENT_BLADE     = 40306;
const AKH_MORN_START    = 40310;              // Pandora's cast; 40311 / 40312 start with it
const PARADISE_REGAINED = 40319;
const WING_CLEAVES      = [40314, 40315];     // physical, on the top-enmity tank
const WING_TETHERS      = [39879, 39880];     // magical, the distance tether
const EXPLOSION         = 40320;              // a two-player tower, soaked
const UNMIT_EXPLOSION   = 40321;              // a tower soaked by fewer than two
const POLARIZING        = 40316;
const BOX               = 40326;
const LB_GIFT           = 40327;              // Paradise Lost's first cast (+251); carries Pandora's HP
const PARADISE_LOST     = 40328;              // the enrage itself (+261)
const DUAL_AUTO         = 40115;              // Pandora's autos on her top two
type Element = "light" | "dark";
const RESIST: Record<Element, number> = { light: 1004164, dark: 1003323 };
const RESIST_NAME: Record<Element, string> = { light: "Light Resistance Down II", dark: "Dark Resistance Down II" };
const EXALINE: Record<number, Element>    = { 40308: "light", 40309: "dark" };   // The Path of Light / Darkness
const AKH_MORN: Record<number, Element>   = { 40311: "light", 40312: "dark" };
const CRUEL_PATH: Record<number, Element> = { 40317: "light", 40318: "dark" };   // the line stacks
const AFTERBLAST: Record<number, Element> = { 40119: "light", 40120: "dark" };   // the lanes exploding after
const ids = (m: Record<number, Element>) => Object.keys(m).map(Number);
// Tank limit break 3s (and 2s) as they appear in a hit's active buffs.
const TANK_LB_RE = /^(Last Bastion|Land Waker|Dark Force|Gunmetal Soul|Stronghold|Shield Wall)$/;

// ── thresholds (VERIFIED above) ─────────────────────────────────────────────

// Exaline hits came +13.8 to +23.9 after each Fulgent Blade cast.
const FULGENT_SWEEP_MS = 12_000;
// Pandora's autos before the first Fulgent Blade fall while the tanks are
// still picking her up (E14 -6.8); a tank raised in the last minute is
// rebuilding enmity (D6 +84.1).
const RAISED_MS = 60_000;
// Deaths this close before the enrage lands are the raid giving up on it.
const PRE_ENRAGE_MS = 5000;
// A third-tower DPS within this of their tower's center when the second wing
// hit them had gone in early (G8/G9/G10/E16: 1.0-2.0 yalms).
const ON_TOWER_YALMS = 3;
// This many hit by one mechanic at once is the group misreading it (wings:
// clean 0 non-tanks, failures 3-8 at once; afterblasts G8 four at once).
const GROUP_HIT = 4;
// Resistance Down II lasts 16s (every application in the sample).
const RESIST_MS = 16_500;
// No P5 clear had more than two dead at once; every pull that reached four
// wiped (and three survived only 38-58s more, A5/F15/I8).
const COLLAPSE_DEAD_COUNT  = 4;
const DD_RESET_MS          = 36_000;
const RESET_AFTER_DEATH_MS = 8000;
const SILENT_HIT_MS        = 3500;
const CALLED_WIPE_COUNT    = 3;
const CALLED_WIPE_WINDOW   = 10_000;
const CALLED_WIPE_END_MS   = 12_000;
const CALLED_WIPE_RAID_DEAD = 4;

// ── helpers ─────────────────────────────────────────────────────────────────

const playersOf = (hits: Hit[]) => uniq(hits.map((h) => h.p));
const diedIn = (life: Life, hits: Hit[]) => uniq(hits.filter((h) => life.diedFrom(h.p, h.e.timestamp)).map((h) => h.p));
const hitsIn = (players: PlayerInfo[], life: Life, abilities: number | number[], from: number, to: number) =>
  hitsOf(players, life, abilities, to).filter((h) => h.e.timestamp >= from);
const sumOf = (es: PlayerEvent[]) => kFmt(es.reduce((s, e) => s + realAmount(e), 0));
const pct = (c?: EnemyEvent) => (c?.hitPoints !== undefined && c.maxHitPoints ? (100 * c.hitPoints) / c.maxHitPoints : undefined);
const clockOf = (ms: number) => `${Math.floor(ms / 60_000)}:${String(Math.floor((ms % 60_000) / 1000)).padStart(2, "0")}`;

/**
 * The player's Resistance Down II of that element still running at `t`: its
 * latest application before the hit (a front player's own new one lands at
 * the hit's millisecond, so the last 100ms don't count). Undefined if none.
 */
function resistAt(p: PlayerInfo, el: Element, t: number): PlayerEvent | undefined {
  const last = p.debuffs
    .filter((e) => e.abilityId === RESIST[el] && e.timestamp < t - 100)
    .sort((a, b) => a.timestamp - b.timestamp)
    .pop();
  return last?.debuffStatus === "applied" && t - last.timestamp <= RESIST_MS ? last : undefined;
}
/** A resistance from an avoidable hit (exaline, afterblast): that hit's error owns what follows. */
const fromAvoidable = (r: PlayerEvent) => r.causeAbilityId !== undefined && (EXALINE[r.causeAbilityId] !== undefined || AFTERBLAST[r.causeAbilityId] !== undefined);

/**
 * The stack (Akh Morn or a Cruel Path line) of the same element that killed
 * the player while the resistance from an avoidable hit at `t` was running.
 */
function lethalStackAfter(p: PlayerInfo, life: Life, els: Element[], t: number): PlayerEvent | undefined {
  return p.damageTaken.find((e) => {
    const el = AKH_MORN[e.abilityId] ?? CRUEL_PATH[e.abilityId];
    return el && els.includes(el) && e.timestamp > t + 100 && e.timestamp - t <= RESIST_MS &&
      resistAt(p, el, e.timestamp) && !!life.diedFrom(p, e.timestamp);
  });
}
const stackName = (id: number) => (AKH_MORN[id] ? `the ${AKH_MORN[id]} Akh Morn stack` : `the ${CRUEL_PATH[id]} Cruel Path line`);

// ── Fulgent Blade ───────────────────────────────────────────────────────────

/**
 * Fulgent Blade's six exalines: every hit by The Path of Light / Darkness is a
 * Damage Down plus that element's Resistance Down II for 16s. All 24
 * holders who then took that element's Akh Morn died (those who joined the
 * other stack lived, G8 +27.0); that death is this hit's consequence,
 * written into its description, not a second error.
 */
function detectExalines(players: PlayerInfo[], life: Life, fulgentT: number[], start: number, end: number): PullError[] {
  const errors: PullError[] = [];
  for (const [p, es] of byPlayer(hitsIn(players, life, ids(EXALINE), start, end))) {
    // One error per player per Fulgent Blade (its lines sweep for ~16s).
    for (const g of clusterByGap(es, (e) => e.timestamp, FULGENT_SWEEP_MS)) {
      const t = g[0].timestamp;
      const els = uniq(g.map((e) => EXALINE[e.abilityId]));
      const death = life.diedFrom(p, g[g.length - 1].timestamp);
      const lethal = death ? undefined : lethalStackAfter(p, life, els, t);
      const which = fulgentT.filter((x) => x <= t).length;
      errors.push(playerError(p, {
        ruleId: PAN_EXALINE_RULE_ID, severity: "Major", name: "Hit by an Exaline",
        description: `Hit by ${joinNames(els.map((el) => el === "light" ? "The Path of Light" : "The Path of Darkness"))} during the ${["first", "second", "third"][which - 1] ?? "a"} Fulgent Blade (${g.length} hit${g.length > 1 ? "s" : ""}, ${sumOf(g)}): Damage Down and ${joinNames(els.map((el) => RESIST_NAME[el]))} for 16s${death ? ", and died" : ""}${lethal ? `. The resistance then made ${stackName(lethal.abilityId)} lethal, and they died to it at ${clockOf(lethal.timestamp)}` : ""}. Only each line's first pulse is marked: follow the strips that already exploded and step into the diamond behind each pair once it passes.`,
        timestamp: t, abilityId: g[0].abilityId, abilityName: g[0].abilityName,
      }));
    }
  }
  return errors;
}

// ── Akh Morn ────────────────────────────────────────────────────────────────

/**
 * After each Fulgent Blade, Akh Morn drops a light stack (40311) on a player
 * at Pandora's left and a dark one (40312) at her right. Every clean
 * resolution was four and four. Failures:
 * - the stacks on one group (J4 +26.8, A3 +140.3: four took both, all died):
 *   a player-less note, or the one or two living players hit by neither,
 *   whose side the stack should have gone to.
 * - one or two players hit by both: named.
 * - a living player in neither stack: named (Major when the stack they left
 *   short killed someone, A4 +26.9).
 * - a player taking the stack of the element they hold a Resistance Down
 *   from a Cruel Path front (none seen); from an exaline it is that error's.
 * Raid when it killed four or more.
 */
function detectAkhMorn(players: PlayerInfo[], life: Life, casts: EnemyEvent[], start: number, end: number): PullError[] {
  const errors: PullError[] = [];
  for (const cast of castsOf(casts, AKH_MORN_START, end).filter((c) => c.timestamp >= start)) {
    const hits = hitsIn(players, life, ids(AKH_MORN), cast.timestamp - 200, cast.timestamp + 3000);
    if (!hits.length) continue;
    const t = hits[0].e.timestamp;
    const light = playersOf(hits.filter((h) => AKH_MORN[h.e.abilityId] === "light"));
    const dark = playersOf(hits.filter((h) => AKH_MORN[h.e.abilityId] === "dark"));
    const both = light.filter((p) => dark.includes(p));
    const absent = players.filter((p) => life.alive(p, t - 500) && !light.includes(p) && !dark.includes(p));
    const killed = diedIn(life, hits);
    const resisted = hits.filter((h) => resistAt(h.p, AKH_MORN[h.e.abilityId], h.e.timestamp));
    const why = "Akh Morn drops the light stack on a player at Pandora's left and the dark one at her right: each group stays on its own side, four and four";
    const killedText = killed.length ? ` ${namesOf(killed)} died.` : "";
    // With someone already dead the sides are short and the stacks retarget
    // (A3 +140.3, H5 +140.0): fallout, only the cutoff below.
    if (!allAlive(players, life, t - 500)) {
      // nothing to name
    } else if (both.length >= 3) {
      if (absent.length && absent.length <= 2) {
        for (const p of absent) {
          errors.push(playerError(p, {
            ruleId: PAN_AKH_MORN_RULE_ID, severity: "Major", name: "Left Their Akh Morn Side Empty",
            description: `Was in neither Akh Morn stack, and both landed on ${namesOf(both)}.${killedText} ${why}; with nobody on a side, its stack goes to the other.`,
            timestamp: t, abilityId: cast.abilityId, abilityName: "Akh Morn",
          }));
        }
      } else {
        errors.push(playerlessMinor(PAN_AKH_MORN_RULE_ID, "Akh Morn Stacks Together",
          `Both Akh Morn stacks landed on the same players (${namesOf(both)})${absent.length ? `, with ${namesOf(absent)} in neither` : ""}.${killedText} ${why}.`,
          t, cast.abilityId, "Akh Morn"));
      }
    } else {
      for (const p of both) {
        const death = killed.includes(p);
        errors.push(playerError(p, {
          ruleId: PAN_AKH_MORN_RULE_ID, severity: death ? "Major" : "Minor", name: "Took Both Akh Morns",
          description: `Stood in both the light and the dark Akh Morn stack${death ? " and died" : ""}. ${why}.`,
          timestamp: t, abilityId: cast.abilityId, abilityName: "Akh Morn",
        }));
      }
      // A stack left short: someone in it died not through their own resistance.
      const shortKilled = killed.filter((p) => !resisted.some((h) => h.p === p) && !both.includes(p));
      for (const p of absent) {
        const mine = light.length < dark.length ? light : dark;
        errors.push(playerError(p, {
          ruleId: PAN_AKH_MORN_RULE_ID, severity: shortKilled.length ? "Major" : "Minor", name: "Missed Akh Morn",
          description: `Was in neither Akh Morn stack (light ${light.length}, dark ${dark.length})${shortKilled.length ? `, and ${namesOf(shortKilled)} died in the ${mine === light ? "light" : "dark"} one` : ""}. ${why}.`,
          timestamp: t, abilityId: cast.abilityId, abilityName: "Akh Morn",
        }));
      }
    }
    for (const h of resisted) {
      const el = AKH_MORN[h.e.abilityId];
      const r = resistAt(h.p, el, h.e.timestamp)!;
      if (fromAvoidable(r) || both.includes(h.p) || !life.diedFrom(h.p, h.e.timestamp)) continue;
      errors.push(playerError(h.p, {
        ruleId: PAN_AKH_MORN_RULE_ID, severity: "Major", name: "Akh Morn Under Resistance Down",
        description: `Took the ${el} Akh Morn stack while holding ${RESIST_NAME[el]} and died. With a resistance, join the other element's stack.`,
        timestamp: h.e.timestamp, abilityId: h.e.abilityId, abilityName: "Akh Morn",
      }));
    }
    if (killed.length >= COLLAPSE_DEAD_COUNT) {
      errors.push(raidMarker(PAN_AKH_MORN_RULE_ID, "Akh Morn",
        `Akh Morn killed ${namesOf(killed)}: unrecoverable from here.`, t, cast.abilityId, "Akh Morn"));
    }
  }
  return errors;
}

// ── Pandora's dual autos ────────────────────────────────────────────────────

/**
 * Pandora auto-attacks her top two enmity players (40115, two hits a swing).
 * Every clean swing landed on the two tanks. A non-tank in a swing with both
 * tanks alive names the tank who took neither hit. Exposure: the tanks.
 */
function detectAutos(players: PlayerInfo[], life: Life, deaths: DeathEvent[], start: number, end: number, occurrences?: ReportedOccurrence[]): PullError[] {
  const errors: PullError[] = [];
  const tanks = players.filter(isTank);
  for (const swing of clusterByGap(hitsIn(players, life, DUAL_AUTO, start, end), (h) => h.e.timestamp, 1500)) {
    const t = swing[0].e.timestamp;
    occurrences?.push({ mechanicKey: PAN_AUTOS_RULE_ID, timestamp: t, players: tanks.map((p) => p.name) });
    const off = swing.filter((h) => !isTank(h.p));
    const live = tanks.filter((p) => life.alive(p, t - 500));
    const idle = live.filter((p) => !swing.some((h) => h.p === p));
    if (!off.length || live.length < 2 || idle.length !== 1) continue;
    if (deaths.some((d) => d.player === idle[0].name && d.timestamp < t && t - d.timestamp <= RAISED_MS)) continue;
    const killed = diedIn(life, off);
    errors.push(playerError(idle[0], {
      ruleId: PAN_AUTOS_RULE_ID, severity: killed.length ? "Major" : "Minor", name: "Lost Second Place on Enmity",
      description: `Pandora's auto-attack hit ${namesOf(playersOf(off))} instead (${sumOf(off.map((h) => h.e))})${killed.length ? ` and killed ${namesOf(killed)}` : ""}: ${idle[0].name} wasn't in her top two on enmity. She auto-attacks her two highest-enmity players, so both tanks keep tank stance.`,
      timestamp: t, abilityId: DUAL_AUTO, abilityName: "Attack",
    }));
  }
  return errors;
}

// ── Paradise Regained: towers, wings and tethers ────────────────────────────

/**
 * Paradise Regained: three two-player towers (+45.6/+49.1/+52.6 after the
 * cast at +35.1; healers, then the two DPS pairs), while Wings Dark and Light
 * cleaves twice at the top-enmity tank (40314/40315, physical) and the
 * distance tether hits the other tank 0.8s after each (39879/39880,
 * magical). Every clean sequence: each wing and each tether on one tank,
 * the tanks swapping, two players per tower.
 */
function detectParadiseRegained(players: PlayerInfo[], life: Life, casts: EnemyEvent[], start: number, end: number, occurrences?: ReportedOccurrence[]): PullError[] {
  const errors: PullError[] = [];
  const tanks = players.filter(isTank);
  const nonTanks = players.filter((p) => !isTank(p));
  for (const pr of castsOf(casts, PARADISE_REGAINED, end).filter((c) => c.timestamp >= start)) {
    const from = pr.timestamp, to = Math.min(end, pr.timestamp + 22_000);
    const wings = WING_CLEAVES.flatMap((id) => clusterByGap(hitsIn(players, life, id, from, to), (h) => h.e.timestamp, 1500))
      .sort((a, b) => a[0].e.timestamp - b[0].e.timestamp);
    const tethers = WING_TETHERS.flatMap((id) => clusterByGap(hitsIn(players, life, id, from, to), (h) => h.e.timestamp, 1500))
      .sort((a, b) => a[0].e.timestamp - b[0].e.timestamp);
    let partyCleaved = false;

    // The wing's 225-degree cleave on anyone but its tank (no Damage Down,
    // only Physical Vulnerability Up; they nearly always died).
    for (const res of wings) {
      const t = res[0].e.timestamp;
      occurrences?.push({ mechanicKey: PAN_WINGS_RULE_ID, timestamp: t, players: nonTanks.map((p) => p.name) });
      const off = res.filter((h) => !isTank(h.p));
      const tether = tethers.find((g) => g[0].e.timestamp > t && g[0].e.timestamp - t <= 1500);
      const killed = diedIn(life, [...res, ...(tether ?? [])]);
      const why = "Wings Dark and Light cleaves 225 degrees toward its tank (the front and one wing's side): the party stays behind the boss on the other side, in their towers";
      if (off.length >= GROUP_HIT) {
        partyCleaved = true;
        errors.push(playerlessMinor(PAN_WINGS_RULE_ID, "Wings Cleaved the Party",
          `Wings Dark and Light hit ${off.length} non-tanks (${namesOf(playersOf(off))})${killed.length ? `; ${namesOf(killed)} died` : ""}. ${why}.`,
          t, res[0].e.abilityId, "Wings Dark and Light"));
        if (killed.length >= COLLAPSE_DEAD_COUNT) {
          errors.push(raidMarker(PAN_WINGS_RULE_ID, "Wings Dark and Light",
            `Wings Dark and Light cleaved the party and killed ${namesOf(killed)}: unrecoverable from here.`, t, res[0].e.abilityId, "Wings Dark and Light"));
        }
      } else {
        for (const h of off) {
          const death = life.diedFrom(h.p, h.e.timestamp);
          // Standing on a tower that resolves after this wing: went in early.
          const next = h.e.x !== undefined && h.e.y !== undefined
            ? castsOf(casts, [EXPLOSION, UNMIT_EXPLOSION], to).find((c) => c.timestamp > t + 1000 && c.x !== undefined && c.y !== undefined &&
                Math.hypot(c.x - h.e.x!, c.y - h.e.y!) / 100 <= ON_TOWER_YALMS)
            : undefined;
          const early = next ? ` They were already on a later tower (${(Math.hypot(next.x! - h.e.x!, next.y! - h.e.y!) / 100).toFixed(1)} yalms from its center, resolving at ${clockOf(next.timestamp)}): wait outside the cleave until this wing goes off, then step in.` : "";
          errors.push(playerError(h.p, {
            ruleId: PAN_WINGS_RULE_ID, severity: death ? "Major" : "Minor", name: "Hit by Wings Dark and Light",
            description: `Was in Wings Dark and Light's cleave (${kFmt(realAmount(h.e))})${death ? " and died" : ""}.${early} ${why}.`,
            timestamp: h.e.timestamp, abilityId: h.e.abilityId, abilityName: "Wings Dark and Light",
          }));
        }
      }
      // Both tanks in one wing. The tether 0.8s later never goes to the
      // wing's own target, so its tank was the other one; but whether they
      // stood in the wrong place or held top enmity they shouldn't have
      // isn't in the log (D6 +45.6: the tether tank took 81k, the target
      // was invulnerable; E4 +45.5: the tether tank was the invulnerable
      // one). Both are named; the tether tank carried Physical
      // Vulnerability Up into their own wing (D6 died to it).
      const hitTanks = playersOf(res).filter(isTank);
      if (hitTanks.length === 2 && tether && off.length < GROUP_HIT) {
        const tetherTank = hitTanks.find((p) => tether.some((h) => h.p === p));
        if (tetherTank) {
          const later = [...wings, ...tethers].flat().filter((h) => hitTanks.includes(h.p) && h.e.timestamp > t + 100);
          const death = later.find((h) => life.diedFrom(h.p, h.e.timestamp));
          for (const p of hitTanks) {
            errors.push(playerError(p, {
              ruleId: PAN_TANK_WINGS_RULE_ID, severity: death ? "Major" : "Minor", name: "Both Tanks in One Wing",
              description: `Both tanks were in one Wings Dark and Light cleave (${hitTanks.map((x) => `${x.name} ${kFmt(realAmount(res.find((h) => h.p === x)!.e))}`).join(", ")}); the tether that followed went to ${tetherTank.name}, so the wing was aimed at ${namesOf(hitTanks.filter((x) => x !== tetherTank))}${death ? `. ${death.p.name} then died at ${clockOf(death.e.timestamp)} under the vulnerability` : ""}. Either the tether tank stood in the cleave or top enmity was on the wrong tank: the wing tank holds first enmity and the other tank stays out of the cleave.`,
              timestamp: t, abilityId: res[0].e.abilityId, abilityName: "Wings Dark and Light",
            }));
          }
        }
      }
    }

    // The distance tether's buster on a non-tank, with both tanks alive and
    // not already taken by the wing just before it.
    for (const res of tethers) {
      const t = res[0].e.timestamp;
      occurrences?.push({ mechanicKey: PAN_TETHER_RULE_ID, timestamp: t, players: nonTanks.map((p) => p.name) });
      if (partyCleaved || tanks.length < 2 || !tanks.every((p) => life.alive(p, t - 500))) continue;
      for (const h of res.filter((x) => !isTank(x.p))) {
        if (wings.flat().some((w) => w.p === h.p && t - w.e.timestamp >= 0 && t - w.e.timestamp <= 2000)) continue;
        const death = life.diedFrom(h.p, h.e.timestamp);
        errors.push(playerError(h.p, {
          ruleId: PAN_TETHER_RULE_ID, severity: death ? "Major" : "Minor", name: "Took the Wing Tether",
          description: `The distance tether's buster hit them (${kFmt(realAmount(h.e))})${death ? " and killed them" : ""}${res.length > 1 ? ` with ${namesOf(playersOf(res).filter((x) => x !== h.p))}` : ""}. The tether goes to the farthest (light) or nearest (dark) player other than the wing's tank: the other tank has to be farther out or closer in than everyone else.`,
          timestamp: t, abilityId: h.e.abilityId, abilityName: "Wings Dark and Light",
        }));
      }
    }

    // Towers: two players each; fewer and the tower goes off as Unmitigated
    // Explosion on everyone (Damage Down). The living non-tanks who soaked no
    // tower in the whole sequence are the missing ones. Every under-soak in
    // the sample followed a soaker's death (E16, F5, F16, G8-G10, H13): none.
    const unmit = clusterByGap(hitsIn(players, life, UNMIT_EXPLOSION, from, to + 3000), (h) => h.e.timestamp, 1500);
    if (!unmit.length) continue;
    const soakers = playersOf(hitsIn(players, life, EXPLOSION, from, to));
    const towers = castsOf(casts, [EXPLOSION, UNMIT_EXPLOSION], to).filter((c) => c.timestamp >= from);
    const lastTower = towers.length ? towers[towers.length - 1].timestamp : to;
    const missing = nonTanks.filter((p) => !soakers.includes(p) && life.alive(p, from + 9000) && life.alive(p, lastTower));
    for (const res of unmit) {
      const t = res[0].e.timestamp;
      const killed = diedIn(life, res);
      const dd = playersOf(res).filter((p) => p.debuffs.some((e) => e.abilityId === DAMAGE_DOWN && e.debuffStatus === "applied" && Math.abs(e.timestamp - t) <= 1500));
      const outcome = `Unmitigated Explosion hit ${playersOf(res).length}${dd.length ? ` with Damage Down` : ""}${killed.length ? ` and killed ${namesOf(killed)}` : ""}`;
      if (res === unmit[0] && missing.length) {
        for (const p of missing) {
          errors.push(playerError(p, {
            ruleId: PAN_TOWER_RULE_ID, severity: "Major", name: "Missed Their Tower",
            description: `Soaked no Paradise Regained tower while alive throughout, and a tower went off short: ${outcome}. Each tower needs two: the healers take the first, each DPS pair one of the next two.`,
            timestamp: t, abilityId: UNMIT_EXPLOSION, abilityName: "Unmitigated Explosion",
          }));
        }
      }
      if (killed.length >= COLLAPSE_DEAD_COUNT) {
        errors.push(raidMarker(PAN_TOWER_RULE_ID, "Unmitigated Explosion",
          `A Paradise Regained tower went off short and killed ${namesOf(killed)}: unrecoverable from here.`, t, UNMIT_EXPLOSION, "Unmitigated Explosion"));
      }
    }
  }
  return errors;
}

// ── Polarizing Strikes / Paths ──────────────────────────────────────────────

/**
 * Polarizing Strikes and three Polarizing Paths: four volleys of two line
 * stacks (light 40317 on Pandora's left, dark 40318 on her right), four
 * players each; the closest takes that element's Resistance Down II and
 * swaps sides (T, M, R, H in every clean pull), then each lane explodes
 * (40119 / 40120: Damage Down and the resistance). Failures:
 * - both lines on one group (B1 +76.6, A5 +81.4, E14 +71.8: four took both,
 *   all died): a player-less note; one or two players in both are named.
 * - a player back in the line of the element they hold a resistance for
 *   (the front player not swapping): named.
 * - an afterblast hit: named (Damage Down); four or more at once is the
 *   group misreading it (G8 +69.8).
 * Raid when a volley killed four or more.
 */
function detectPolarizing(players: PlayerInfo[], life: Life, casts: EnemyEvent[], start: number, end: number): PullError[] {
  const errors: PullError[] = [];
  for (const cast of castsOf(casts, POLARIZING, end).filter((c) => c.timestamp >= start)) {
    const from = cast.timestamp, to = Math.min(end, cast.timestamp + 22_000);
    const volleys = clusterByGap(hitsIn(players, life, ids(CRUEL_PATH), from, to), (h) => h.e.timestamp, 1500);
    const why = "The light line stacks on Pandora's left and the dark one on her right; each volley's front player takes a Resistance Down II and crosses to the other line";
    volleys.forEach((hits, i) => {
      const t = hits[0].e.timestamp;
      const light = playersOf(hits.filter((h) => CRUEL_PATH[h.e.abilityId] === "light"));
      const dark = playersOf(hits.filter((h) => CRUEL_PATH[h.e.abilityId] === "dark"));
      const both = light.filter((p) => dark.includes(p));
      const killed = diedIn(life, hits);
      const nth = ["first", "second", "third", "fourth"][i] ?? "a";
      // After a death the swap order breaks and the lines retarget: only
      // the cutoff below (H13 +179.3, I3 +179.6).
      const everyone = allAlive(players, life, t - 500);
      if (!everyone) {
        // nothing to name
      } else if (both.length >= 3) {
        errors.push(playerlessMinor(PAN_POLARIZING_RULE_ID, "Cruel Paths on One Group",
          `Both lines of the ${nth} Cruel Path volley hit the same players (${namesOf(both)}).${killed.length ? ` ${namesOf(killed)} died.` : ""} ${why}.`,
          t, hits[0].e.abilityId, "Cruel Path"));
      } else {
        for (const p of both) {
          const death = killed.includes(p);
          errors.push(playerError(p, {
            ruleId: PAN_POLARIZING_RULE_ID, severity: death ? "Major" : "Minor", name: "Took Both Cruel Paths",
            description: `Stood in both lines of the ${nth} Cruel Path volley${death ? " and died" : ""}. ${why}.`,
            timestamp: t, abilityId: hits[0].e.abilityId, abilityName: "Cruel Path",
          }));
        }
      }
      for (const h of hits) {
        const el = CRUEL_PATH[h.e.abilityId];
        const r = resistAt(h.p, el, h.e.timestamp);
        if (!everyone || !r || fromAvoidable(r) || both.includes(h.p)) continue;
        const death = life.diedFrom(h.p, h.e.timestamp);
        errors.push(playerError(h.p, {
          ruleId: PAN_POLARIZING_RULE_ID, severity: death ? "Major" : "Minor", name: "Same Element Twice",
          description: `Took the ${el} line of the ${nth} Cruel Path volley while still holding ${RESIST_NAME[el]} (${kFmt(realAmount(h.e))})${death ? " and died" : ""}. ${why}: after your own front hit, cross to the ${el === "light" ? "dark" : "light"} line.`,
          timestamp: h.e.timestamp, abilityId: h.e.abilityId, abilityName: h.e.abilityName,
        }));
      }
      if (killed.length >= COLLAPSE_DEAD_COUNT) {
        errors.push(raidMarker(PAN_POLARIZING_RULE_ID, "Cruel Path",
          `The ${nth} Cruel Path volley killed ${namesOf(killed)}: unrecoverable from here.`, t, hits[0].e.abilityId, "Cruel Path"));
      }
    });

    // The lanes exploding ~2s after each volley.
    const why2 = "Each line's lane explodes about two seconds after it hits (wider than it looks): everyone but the next front player steps out of both lanes";
    for (const res of clusterByGap(hitsIn(players, life, ids(AFTERBLAST), from, to + 3000), (h) => h.e.timestamp, 1000)) {
      const hit = playersOf(res);
      const killed = diedIn(life, res);
      if (hit.length >= GROUP_HIT) {
        errors.push(playerlessMinor(PAN_AFTERBLAST_RULE_ID, "Group in a Cruel Path Lane",
          `${hit.length} players stayed in an exploding Cruel Path lane (${namesOf(hit)}), all with Damage Down${killed.length ? `; ${namesOf(killed)} died` : ""}. ${why2}.`,
          res[0].e.timestamp, res[0].e.abilityId, "Cruel Path"));
        continue;
      }
      for (const p of hit) {
        const mine = res.filter((h) => h.p === p).map((h) => h.e);
        const els = uniq(mine.map((e) => AFTERBLAST[e.abilityId]));
        const death = life.diedFrom(p, mine[mine.length - 1].timestamp);
        const lethal = death ? undefined : lethalStackAfter(p, life, els, mine[0].timestamp);
        errors.push(playerError(p, {
          ruleId: PAN_AFTERBLAST_RULE_ID, severity: "Major", name: "Hit by a Cruel Path Lane",
          description: `Was in a Cruel Path lane when it exploded (${sumOf(mine)}): Damage Down and ${joinNames(els.map((el) => RESIST_NAME[el]))}${death ? ", and died" : ""}${lethal ? `; the resistance then made ${stackName(lethal.abilityId)} lethal (died at ${clockOf(lethal.timestamp)})` : ""}. ${why2}.`,
          timestamp: mine[0].timestamp, abilityId: mine[0].abilityId, abilityName: mine[0].abilityName,
        }));
      }
    }
  }
  return errors;
}

// ── Pandora's Box ───────────────────────────────────────────────────────────

/**
 * Pandora's Box needs a tank limit break 3: every Box in the sample landed
 * under one (Last Bastion / Gunmetal Soul on all eight hits, cast ~3s
 * before). Box landing with no tank LB on anyone is a player-less note; a
 * Box that killed four or more is the cutoff.
 */
function detectBox(players: PlayerInfo[], life: Life, casts: EnemyEvent[], start: number, end: number): PullError[] {
  const errors: PullError[] = [];
  for (const cast of castsOf(casts, BOX, end).filter((c) => c.timestamp >= start)) {
    const hits = hitsIn(players, life, BOX, cast.timestamp - 200, cast.timestamp + 5000);
    if (!hits.length) continue;
    const t = hits[0].e.timestamp;
    const killed = diedIn(life, hits);
    const lb = hits.some((h) => h.e.activeBuffNames?.some((n) => TANK_LB_RE.test(n)));
    if (!lb && hits.some((h) => h.e.activeBuffNames)) {
      errors.push(playerlessMinor(PAN_BOX_RULE_ID, "Pandora's Box Without a Tank LB",
        `Pandora's Box hit ${playersOf(hits).length} players with no tank limit break up${killed.length ? `; ${namesOf(killed)} died` : ""}. Box needs the party's limit break gauge saved for a tank LB3 timed just before it lands.`,
        t, BOX, "Pandora's Box"));
    }
    if (killed.length >= COLLAPSE_DEAD_COUNT) {
      errors.push(raidMarker(PAN_BOX_RULE_ID, "Pandora's Box",
        `Pandora's Box killed ${namesOf(killed)}: unrecoverable from here.`, t, BOX, "Pandora's Box"));
    }
  }
  return errors;
}

// ── deaths with no killing blow ─────────────────────────────────────────────

const playerOf = (players: PlayerInfo[], d: DeathEvent) => players.find((x) => x.name === d.player);
/** A player still under Damage Down walking out to clear it (as P4's resets). */
const ddReset = (p: PlayerInfo, d: DeathEvent) => p.debuffs.some((e) => e.abilityId === DAMAGE_DOWN && e.debuffStatus === "applied" && e.timestamp < d.timestamp &&
  (d.timestamp - e.timestamp <= DD_RESET_MS || !p.debuffs.some((r) => r.abilityId === DAMAGE_DOWN && r.debuffStatus === "removed" && r.timestamp > e.timestamp && r.timestamp < d.timestamp - DEATH_EVENT_LAG_MS - 500)));

/** No-killing-blow deaths that are the wipe being called: 3+ within 10s, or one at the end with half the raid dead. */
function calledWipeDeaths(players: PlayerInfo[], deaths: DeathEvent[], life: Life, pullEnd: number): Set<DeathEvent> {
  const silent = deaths.filter((d) => !d.killingAbilityGameId && playerOf(players, d));
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
 * A no-killing-blow death mid-phase: a Damage Down reset, the raid resetting
 * after another death, a killing blow FFLogs dropped (a hit just before), or
 * walking into the deathwall (Major). Pandora has no knockbacks.
 */
function detectWallDeaths(players: PlayerInfo[], deaths: DeathEvent[], called: Set<DeathEvent>, start: number, end: number): PullError[] {
  const errors: PullError[] = [];
  for (const d of deaths) {
    if (d.killingAbilityGameId || called.has(d) || d.timestamp < start || d.timestamp > end + DEATH_EVENT_LAG_MS) continue;
    const p = playerOf(players, d);
    if (!p || ddReset(p, d)) continue;
    if (deaths.some((x) => x !== d && x.player !== d.player && x.timestamp <= d.timestamp && d.timestamp - x.timestamp <= RESET_AFTER_DEATH_MS)) continue;
    if (p.damageTaken.some((e) => (e.amount ?? 0) > 0 && e.timestamp <= d.timestamp && d.timestamp - e.timestamp <= SILENT_HIT_MS)) continue;
    errors.push(playerError(p, {
      ruleId: PAN_WALL_RULE_ID, severity: "Major", name: "Walked Out of the Arena",
      description: "Died with no killing blow mid-phase: walked into the deathwall.",
      timestamp: d.timestamp - DEATH_EVENT_LAG_MS, abilityId: 0, abilityName: "Deathwall",
    }));
  }
  return errors;
}

// ── entry point ─────────────────────────────────────────────────────────────

/**
 * Futures Rewritten Phase 5 (Pandora) errors. Self-gates on Pandora's
 * casts (the actor appears in no other phase); runs from her first cast to
 * the pull's end or the enrage's landing.
 */
export function detectPandoraErrors(
  players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], occurrences?: ReportedOccurrence[],
): PullError[] {
  const first = enemyCasts.find((c) => c.actorName === PANDORA_NAME);
  const fulgent = castsOf(enemyCasts, FULGENT_BLADE, Infinity);
  if (!first || !fulgent.length) return [];
  const start = first.timestamp - 1000;
  // The enrage counts only when it landed: in a clear (B3) it was cast as
  // Pandora died and its hits came to nothing.
  const enrageHit = players.flatMap((p) => p.damageTaken.filter((e) => e.abilityId === PARADISE_LOST && e.healthAfter === 0 && (e.amount ?? 0) > 0 && e.timestamp > start))
    .sort((a, b) => a.timestamp - b.timestamp)[0];
  const deaths = deathEvents.filter((d) => d.timestamp <= (enrageHit?.timestamp ?? Infinity) + DEATH_EVENT_LAG_MS - 200);
  const life = buildLife(players, deaths);
  const dataEnd = Math.max(0, ...players.flatMap((p) => [...p.damageTaken, ...p.casts].map((e) => e.timestamp)));
  const lastEvent = Math.max(dataEnd, ...deathEvents.map((d) => d.timestamp));
  const end = Math.min(enrageHit ? enrageHit.timestamp - 100 : Infinity, dataEnd);
  const p5Deaths = deaths.filter((d) => d.timestamp >= start);
  const called = calledWipeDeaths(players, p5Deaths, life, Math.min(end, lastEvent));

  const errors = [
    ...detectExalines(players, life, fulgent.map((c) => c.timestamp), start, end),
    ...detectAkhMorn(players, life, enemyCasts, start, end),
    ...detectAutos(players, life, p5Deaths, fulgent[0].timestamp, end, occurrences),
    ...detectParadiseRegained(players, life, enemyCasts, start, end, occurrences),
    ...detectPolarizing(players, life, enemyCasts, start, end),
    ...detectBox(players, life, enemyCasts, start, end),
    // From the first Fulgent Blade: deaths in the ~8s before it are P4's
    // Damage Down resets carried over the cutscene (G8 -8.1).
    ...detectWallDeaths(players, p5Deaths, called, fulgent[0].timestamp, enrageHit ? enrageHit.timestamp - PRE_ENRAGE_MS - DEATH_EVENT_LAG_MS : end),
  ];

  if (enrageHit) {
    const gift = enemyCasts.filter((c) => c.abilityId === LB_GIFT && c.timestamp > start).pop();
    const left = pct(gift);
    errors.push(raidMarker(PAN_ENRAGE_RULE_ID, "Paradise Lost (Enrage)",
      `Pandora wasn't brought down before Paradise Lost landed.${left !== undefined ? ` She had ${left.toFixed(1)}% left when its cast began (the clears had 6-8%).` : ""} The DPS check wasn't met.`,
      enrageHit.timestamp, PARADISE_LOST, "Paradise Lost"));
  }

  // Generic cutoffs, only the earliest and only before any mechanic Raid.
  const generic: PullError[] = [];
  const calledList = p5Deaths.filter((d) => called.has(d)).sort((a, b) => a.timestamp - b.timestamp);
  if (calledList.length >= CALLED_WIPE_COUNT) {
    generic.push(raidMarker(PAN_CALLED_WIPE_RULE_ID, "Wipe Called",
      `${calledList.length} players died with no killing blow (${joinNames(uniq(calledList.map((d) => d.player)))}): the wipe was called and the raid reset.`,
      calledList[0].timestamp - DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  const outAt = (t: number) => players.filter((p) => !life.alive(p, t));
  const collapseT = life.outIntervals.map((w) => w.start).filter((t) => t >= start && t <= end).sort((a, b) => a - b)
    .find((t) => outAt(t).length >= COLLAPSE_DEAD_COUNT);
  if (collapseT !== undefined) {
    const who = outAt(collapseT).map((p) => p.name);
    generic.push(raidMarker(PAN_COLLAPSE_RULE_ID, "Party Collapse",
      `${who.length} players were dead at once (${joinNames(who)}). No Phase 5 pull recovered from four down; treated as the cutoff point.`,
      collapseT + DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  const firstRaid = Math.min(...errors.filter((e) => e.severity === "Raid").map((e) => e.timestamp));
  const marker = generic.sort((a, b) => a.timestamp - b.timestamp)[0];
  if (marker && marker.timestamp < firstRaid) errors.push(marker);
  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
