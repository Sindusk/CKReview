// lib/mechanics/ffxiv/fru/oracle-of-darkness.ts
//
// Futures Rewritten Phase 3 (Oracle of Darkness) per-pull rules. Entry
// point: detectOracleOfDarknessErrors. Self-gates on Hell's Judgment /
// Ultimate Relativity, runs from Hell's Judgment to Memory's End passing.
// The fallback model (fallback.ts MODULE_PHASES) stays out of P3.
//
// -- VERIFIED AGAINST LOGS (2026-10-12) --
// 133 pulls that reached P3, no VODs. Two statics:
// - A-S: the 19 reports of usurper-of-frost.ts (same letters), 91 P3 pulls,
//   refetched with `--from-minutes 2.4 --to-minutes 10.75`.
// - T wdH8Az193bYxJTRf, U t8VfAkyq2YFzBjDP, V abPA9dLJVD4rn6Zq,
//   W yWrQA4ac1VfMhgR7, X cQL739vDqXgxhAPy: a second static (the user's
//   own, fatebreaker.ts's group A), 42 P3 pulls, fetched with
//   `--min-minutes 7.3 --from-minutes 6.9 --to-minutes 10.75`. T is now on
//   disk whole (2026-10-12) for its P1/P2 VOD review.
// Cited as V22 +34.0: pull number, seconds after Hell's Judgment (7:23-7:27
// into the pull). Six Memory's End passes (S10, V22, W4, W8, X5, X8), 22
// enrages, the rest wiped earlier.
// Clock (every pull within ~0.5s): Hell's Judgment +0, Ultimate Relativity
// +14.2 (its statuses land +15.1), fires / Unholy / Blizzard cast +26.2,
// +36.2, +46.1 (damage +0.6), first Meltdown shots +31.3 / +41.3 / +52.4,
// Return stun +55.2, rewind resolution +58.2, Shell Crusher +62.4, Shockwave
// Pulsar +70.5, Black Halo +78.8, Spell-in-Waiting Refrain +88.0, Waters
// +106.8 / +125.8 / +134.8, Spirit Taker +109.5, Apocalypse waves every 2s
// from +117.6 to +128, its Dark Eruption +119.9, Darkest Dance jump +128.3
// and knockback ~+131, Pulsar +140.5, Memory's End cast +153.4-154.2.
// Log IDs (most cactbot candidates were right; names alone are ambiguous):
// - Spell-in-Waiting statuses carry their timer in the apply's `duration`
//   (now PlayerEvent.durationMs): Dark Fire III 1002455 11/21/31s, Unholy
//   Darkness 1002454 11/21/31s, Dark Blizzard III 1002462 21s, Dark Water III
//   1002461 / Dark Eruption 1002460 / Shadoweye 1002456 43s, Return 1002464
//   16/26s then Return 1002452 24/14s, ending in Stun 1004163 (P2's gaze
//   Stun ID). The model's role template held: 20s-fire DPS get the Water,
//   30s-fire supports and the long DPS Shadoweye, the rest Eruption.
// - Resolutions: Dark Fire III 40276, Unholy Darkness 40277, Dark Blizzard
//   III 40279 (Damage Down), Dark Water III 40271, Dark Eruption 40274,
//   Shadoweye 40278 (0-damage on everyone; facing one gives Doom 1002516).
//   Sinbound Meltdown 40235 is each hourglass's first shot, a line through
//   the nearest player (cast target = the baiter, cast x/y = the hourglass
//   ~9.5y out); 40292 are the rotating follow-up shots every ~1.1s.
// - FFLogs drops a cast's target when it hit several players: 89 of 95
//   fires that hit 2+ had none. Owners come from the holders instead.
// - Shell Crusher 40286/40287 (one stack), Shockwave Pulsar 40282, Black Halo
//   40290 (tank cone: 64 tank hits, 3 others), Spell-in-Waiting Refrain 40269
//   (Waters 1002461 for 10/29/38s, two players each), Spirit Taker 40288 /
//   40289 (jump + knock), Apocalypse 40296 / 40297 (Damage Down), Darkest
//   Dance 40181 cast, 40182 the jump on the farthest (38 tank, 6 other hits),
//   40183 the raid knockback. Memory's End 40300 cast; 40335 = passed (Gaia
//   at 16.6-19.7% on the cast), 40336 = enrage (20.1-56.8%).
// Model questions the log answered:
// - A fire holder who dies sets their fire off on the spot at once
//   (untargeted cast ~0.1s after the fatal hit, V5 +31.9), killing the
//   stack, whose fires go off in turn. 74 of the wipes collapsed in
//   Relativity, nearly all this way.
// - Unholy Darkness is soaked by everyone without a fire at that timer (289
//   of 296 resolutions with all alive had nobody else missing); under 5
//   gives Mark of Mortality 1004372 (4: 8 of 8, 5: 0 of 115).
// - Water: under 4 gives Mark of Mortality (3: 31 of 36; 4: 0 of 184).
//   Each Refrain group of four held one 10s, one 29s, one 38s and one
//   without in 56 of 58 clean resolutions. A Mark holder hit by the next
//   Water dies with no killing blow (W3 +134.9).
// - Shadoweye gives Doom, nobody cleansed it, and it killed ~5s later with
//   no killing blow (54 applications).
// - No pull had anyone dead going into Relativity; one survived Refrain a
//   player down to Memory's End (Q14), so there is no "dead going in" rule.
// - Four dead at once never recovered (no clear had more than one down
//   before Memory's End); three did (U14 to Memory's End).
// - No killing blow: Darkest Dance knockback (2.7-3.8s after it), Spirit
//   Taker's knock (3.3-3.8s), Doom, a Mark of Mortality Water, one player
//   who died as Return pulled them back (V10 +55.8), resets.
// Cutoffs (first Raid error) of the 127 non-clears: collapse 118 (74 in
// Relativity, 2 at its raidwide, 7 Shell Crusher to Pulsar, 35 Apocalypse),
// enrage 8, called wipe 1. The five clears with no error and W4 (a doubled
// Water) have none. Wipes with nobody named before the cutoff: J15 and U12
// (a baiter left at ~0% by their own single shot), O28 and T6 (deaths to
// Relativity's raidwide right after Hell's Judgment), V12 (one beam swept
// all seven): their released fires are player-less errors.
//
// -- RULES IMPLEMENTED --
// ffxiv-ood-fire: a Relativity fire that caught others (Major on a death):
//   the owner, plus the caught when one or two; two holders in one fire
//   both. Player-less: fires released by a death, one per chain.
// ffxiv-ood-unholy: with all alive, a fire-less player missing an Unholy
//   (Major when it came up short).
// ffxiv-ood-blizzard (Major): Dark Blizzard III hits; 3+ hit names the holder.
// ffxiv-ood-bait: a first Meltdown shot that hit 2+ names everyone in it
//   (the baiter alone when 3+ others); Major on a death.
// ffxiv-ood-avoidable: follow-up Meltdown shots (Major on a death); one shot
//   on 4+ is player-less.
// ffxiv-ood-eruption: rewind Eruption overlaps (as the fires), Apocalypse
//   Eruption players hit twice. ffxiv-ood-gaze (Major): Doom from Shadoweye.
// ffxiv-ood-water: rewind Water missed by its Water / Shadoweye holder;
//   Refrain Waters (all alive): both of a timer together, missing players,
//   the duplicated-timer members of an oversized group, doubled players.
// ffxiv-ood-shell-crusher: missed (all alive). ffxiv-ood-spirit-taker: a
//   shared jump (target known: the others; else all). ffxiv-ood-tank-buster:
//   non-tanks hit by Black Halo / Darkest Dance (exposure: the non-tanks).
// ffxiv-ood-apocalypse (Major, Damage Down); a wave on 4+ is player-less.
// ffxiv-ood-wall (Major): Darkest Dance knockbacks, Return into the wall,
//   walk-offs. ffxiv-ood-enrage / -called-wipe / -collapse (Raid).
// The Damage Down causes are excluded from ffxiv-damage-down (error-rules.ts).
// Not built: deaths to raidwides (healing), light ownership / relative
// north / Return snapshot positions, NAUR/LPDU/MUR presets and who should
// flex in Refrain (priority), Water / Eruption behaviour on a holder's death.
//
// -- GUIDE-DERIVED MODEL: ORACLE OF DARKNESS (FRU PHASE 3) --
// Futures Rewritten (Ultimate), patch 7.11 origin; checked 2026-10-09.
// Comments only. No real reports checked; ALL proposed log signals and
// attribution are guide-derived hypotheses. Shared contract: fatebreaker.ts.
// Previous module owns Ice Veil. enter-the-dragon.ts owns subsequent duo phase.
// Baseline WTFDIG NAUR; LPDU/MUR mechanics choices documented separately.
// Damage Down/Mark of Mortality -> Major when root player proven; Raid is
// first inevitable wipe. Unknown assignment or clipped victim is not fault.
//
// -- SOURCES --
// [N] Tvnariea Reksane's original NAUR mechanic explanation:
//     https://naurffxiv.com/ultimate/fru/guide/p3
// [U] Original NAUR Relativity slides, all 20 inspected:
//     https://tinyurl.com/lesbin-ur
// [A] Original NAUR static-spread Apocalypse diagrams:
//     https://raidplan.io/plan/gU44027CtpmKs-sC
// [L] LPDU's own current assignments, sourced from Fijou:
//     https://lpdu.net/fru/p3/
//     https://raidplan.io/plan/OCGsXXXpUHCT5QiH
// [MU] MUR original Relativity plan, both Y orientations inspected:
//      https://raidplan.io/plan/oYnDQe4ZbVaoxA5r
// [MA] MUR LP-priority Apocalypse plan, updated Em:
//      https://raidplan.io/plan/LZwXKA645GGmjEO2
// [I] Tor's original guide, 2024-12-06:
//     https://www.icy-veins.com/ffxiv/futures-rewritten-ultimate-guide-for-phase-3-oracle-of-darkness
// [C] Original Cactbot timeline; ACT/game IDs, unverified FFLogs mapping:
//     https://github.com/OverlayPlugin/cactbot/blob/main/ui/raidboss/data/07-dt/ultimate/futures_rewritten.txt
// No mechanic-changing hotfix established. U revised G1 flex and rewind
// placements after release; old generic priorities need not match NAUR.
// N's debuff table appears to mislabel the two short-fire DPS as Shadoweye;
// its prose and U/I instead assign them Eruption. Prose/U model used here.
//
// -- PHASE SHAPE, GATE AND CLOCK --
// Ice Veil defeat, Junction and ~27s transition precede Gaia targetability.
// Full uptime, one Relativity then one six-wave Apocalypse. No energy bar.
// Circular deathwall. HP must be BELOW 20% by Memory's End completion;
// passing gives raid damage and P4, failing is lethal enrage (Raid).
// Approximate offsets from first targetability [C], cast starts earlier:
// 00:04 Judgment; 00:18 Relativity; 01:06 Shell; 01:22 Black Halo;
// 01:50 first Water; 02:04 Eruption; 02:12 Dance; 02:38 Memory's End.
// P4 Shiva appears N/S opposite Gaia's final side; E/W boundary choice can
// be ambiguous. Phase anchor events supersede whole-pull timestamps.
// Hell's Judgment reduces HP to ~1, ignoring shields/mitigation. Heal for
// next raidwide; it is expected damage, not a mitigation failure. Max-HP
// buff expiring between snapshot/damage can kill [N]; cause needs a trace.
//
// -- ULTIMATE RELATIVITY: DEBUFF ASSIGNMENT [U, MU] --
// Raidwide; seven Spell-in-Waiting: Dark Fire III and one Dark Blizzard III.
// Role template (one short support OR long DPS replaced by 20s Blizzard):
// Supports: two 30s fires, one 20s fire, one 10s fire/20s Blizzard.
// DPS: two 10s fires, one 20s fire, one 30s fire/20s Blizzard.
// Supports 30s and long DPS: 26s waiting Return + 43s Shadoweye (three).
// DPS 20s: 16s waiting Return + 43s Water (one).
// Other supports/DPS: 16s waiting Return + 43s Eruption (four).
// Three separate Unholy Darkness marks resolve at 10/20/30s, on players
// whose fire/ice does not share that timer. Blizzard is a centered donut;
// its holder stays with stack at 20s, not out with a fictitious fire.
// Fires spread beyond assigned light. Others soak Unholy: MINIMUM five,
// usually five or six. Too few gives Mark of Mortality; extra sixth is valid.
// Failure: overlapping fire/ice donut -> LOG: extra elemental damage under
//   magic vuln or penalty/death; FAULT: misplaced carrier if snapshot proves
//   it, not every victim; CONSEQUENCE: Major on death/penalty.
// Failure: small Unholy -> LOG: fewer than five living recipients + Mark;
//   FAULT: missing assigned helper if known; CONSEQUENCE: Major/Raid.
// Removal: waiting spell expiry casts its attack; death/early removal can
// change planned counts. Exact death-triggered behavior remains unverified.
// Not errors: own fire, correct donut/Unholy, initial raidwide.
//
// -- RELATIVITY: EIGHT HOURGLASSES AND REGIONAL PRIORITIES [MU, U, L] --
// Eight Delight's Hourglass on principal directions. Speed assigns three
// yellow (first), three untouched (second), two purple (third); Y is random
// rotation. Relative N is gap between two yellow arms, lone yellow S.
// Long supports NW/NE, long DPS/Blizzard S; short DPS SW/SE, short support/
// Blizzard N; medium support W, medium DPS E. Reversing relative N requires
// reversing directions AND priority; one rotated frame is not a mistake.
// NAUR: healer prefers NW, tank NE; ranged SW, melee SE. Doubled job-role:
// G1 adjusts for G2 (H1 to NE, MT to NW, R1 to SE, M1 to SW).
// LPDU/MUR balls-N priorities: H1,MT,OT,H2 NW->NE; R1,M1,M2,R2 SW->SE.
// Example H2+MT long: NAUR H2 NW/MT NE; LPDU/MUR MT NW/H2 NE. This
// distinguishes plans; a lone mixed pair can otherwise fit several labels.
// Sinbound Meltdown nearest-player beam: bait initial shot across center,
// then retreat around own light opposite indicated spin. Ten shots rotate
// over ~120 degrees; follow-ups are avoidable, including during rewind.
// Yellow lights bait at ~16s by long cohort; untouched at ~26s by short;
// purple at ~36s by medium. These are offsets from debuff application.
// Failure: beam repeats/stray ray -> LOG: follow-up Meltdown damage/penalty;
//   FAULT: mover or misplaced initial aimer if source/ray known;
//   CONSEQUENCE: Major on penalty/death. One intended initial bait is normal.
// Failure: wrong light ownership -> LOG: same nearest player hit by two
//   beams, or bad initial direction clipping others; FAULT: controller if
//   frame/priority and actor coordinates establish it; CONSEQUENCE: Major.
// Not errors: target selection by initial bait and independent beam spins.
//
// -- RETURN SNAPSHOTS, STUN AND DELAYED RESOLUTION [N, I, U] --
// Waiting Return expiry at 16/26s records location, then applies actual
// Return for 24/14s. All rewind at ~40s with 4s Stun; delayed effects at
// ~43s resolve while immobile. Facing is NOT recorded with the location.
// Water snapshot near center on E ray; three eyes spaced near center on
// NW/NE/S rays. Four Eruptions outside near own light; W medium support
// must snapshot just INSIDE its light to escape later rotating beam.
// Sequence: short fires/Unholy -> yellow baits + short snapshots -> medium
// fires/ice/Unholy -> untouched baits + long snapshots -> long fires/Unholy
// -> purple baits -> face outward -> rewind -> Water/eyes/Eruptions.
// Water + three eyes form four-player stack. Eyes cannot gaze each other;
// everyone faces outward before Stun, including nearby eye holders.
// Failure: bad snapshot -> LOG: post-rewind Eruption overlap, Water Mark or
//   Meltdown death; FAULT: snapshot placer if location data establishes it;
//   CONSEQUENCE: Major; Raid on unrecoverable multi-kill.
// Failure: gaze -> LOG: Shadoweye death/Petrification if present; FAULT:
//   viewer with proven facing, or misplaced eye clipping assigned viewer;
//   CONSEQUENCE: Major. Damage alone cannot prove whose facing was wrong.
// Removal: actual Return expiry moves/stuns, not cleanse. Death removals do
// not prove snapshot success. Spell-in-Waiting and resolving attacks may
// have separate IDs reused by P4; phase-scoped interpretation is essential.
// Not errors: forced teleport/Stun and correct four-player Water hit.
//
// -- SHELL CRUSHER, PULSAR, BLACK HALO [I] --
// Shell Crusher random-player whole-party stack; Shockwave Pulsar raidwide.
// Black Halo aggro-targeted shared tank cone: both tanks mitigate away from
// party, or established solo mitigation/invuln strategy. It is not two
// mandatory distinct busters. Pulsar repeats after Apocalypse.
// Failure: wrong cone/stack -> LOG: non-tank Halo damage, small Shell deaths;
//   FAULT: controller/missing helper if established; CONSEQUENCE: Major on
//   death. Expected stack/buster/raidwide damage is never an error alone.
//
// -- SPELL-IN-WAITING REFRAIN: THREE WATER PAIRS [A, MA, L] --
// Six players receive two each of 10/29/38s Water, two have none. Each four
// must have ONE of each timer and one none; none/none is also a duplicate.
// NAUR initially supports W / DPS E in boxes. Duplicates swap using MT,OT,
// H1,H2 support and M1,M2,R1,R2 DPS priority; higher priority moves.
// NAUR STATIC SPREADS: flex for first Water, return to original role spread
// locations for Spirit Taker/Eruption, then re-flex for second/third Water.
// Supports use safe red/purple sector, DPS yellow/blue; G1 left/G2 right
// facing middle. Near positions within safe pizza rays, far 2.5 wall notches
// outside; maintain individual spacing. This return is intentional.
// LPDU initially supports NW / DPS SE; same role swap priorities but KEEP
// flexed group and inherit swapped player's spread location throughout.
// Its Spirit Taker tank/melee spots MT A, OT D, M1 C, M2 B.
// MUR initially LP1 W / LP2 E, not support/DPS groups. Equal-status pairs
// use H1,R1,M1,MT,OT,M2,R2,H2 ordering W->E; keep flexed groups/spots.
// Two or four flexes can be valid. No flex needed with balanced timers.
// Failure: duplicated/missing stack -> LOG: overlapped Waters under magic
//   vuln or undersoak Mark; FAULT: wrong flex/missing helper if assignment
//   and original timers prove it; CONSEQUENCE: Major/Raid.
// Not errors: three paired Water resolutions; NAUR temporary return or
// LPDU/MUR permanent flex, even though those movements differ visibly.
//
// -- SIX APOCALYPSE WAVES, SPIRIT TAKER AND DARKEST DANCE [A, MA] --
// Two opposite lights start at cardinal/intercardinal and rotate CW/CCW;
// two more originate center and follow. Read start and direction: initial
// safe sector one marker opposite rotation. Six explosion waves, Eruption
// spreads coincide with second; move inward after Eruption for next waves.
// Spirit Taker random-target jump before explosions: spread in boxes, not
// a stack. Nearby non-target is knocked toward wall; root is bad spacing.
// Second Water near center precedes Darkest Dance farthest-player buster.
// Assigned tank (NAUR OT) baits next safe wall sector ~90 degrees from light
// origin; Gaia jumps there then knocks everyone outward. Follow without
// standing in buster. Final Water groups take left/right facing Gaia and
// meet after knockback; gap close is valid, leaving ranged behind is not.
// Failure: explosion/Eruption overlap -> LOG: Apocalypse damage/Damage
//   Down or doubled spread; FAULT: mover/overlap controller if established;
//   CONSEQUENCE: Major, not automatic blame on displaced victim.
// Failure: wrong farthest/wall bait -> LOG: Dance on non-tank, buster clip,
//   knockback wall death; FAULT: far-bait controller or player farther than
//   tank if position snapshot known; CONSEQUENCE: Major, Raid if terminal.
// Failure: missed final Water -> LOG: Mark/death after knockback; FAULT:
//   assigned helper who failed to reunite if proven; CONSEQUENCE: Major.
// Not errors: tank Dance, knockback, expected Water and Pulsar. No enrage
// blame to a player solely because boss HP misses its damage check.
//
// -- OBSERVABILITY AND OPEN LOG-VERIFICATION QUESTIONS --
// Candidate C action hex: 9D54 fire damage, 9D56 eye damage, 9D55 Unholy,
// 9D4F Water, 9D2B initial Meltdown ability. These are not verified FFLogs
// IDs; repeated damage/controller names and P4 reuse need separate mapping.
// 1. Do successful UR mixed/doubled role pairs distinguish NAUR role/G1
//    adjustment from LPDU/MUR priority? Are Speed endpoints/light centers
//    available to infer the relative frame without animation or facing?
// 2. Can Apoc stack recipients plus intermediate damage positions show
//    NAUR return-to-role vs retained flex, and role-group vs MUR LP start?
//    Balanced pulls cannot settle swap priority. Mixed presets are valid;
//    Strategy needs compatible/unknown candidates and explicit override.
// 3. Resolve all cast/damage/status IDs, especially same-name waiting vs
//    resolution, initial vs follow-up beam, gaze, split-stack penalties.
//    Verify N's table discrepancy, Mark stacking threshold and exact timers.
// 4. Does a carrier dying trigger each delayed Fire/Water/Unholy/Return/eye
//    early, cancel it or retarget? Which event marks first inevitable loss?
//    A death-time status removal alone does not answer this.
// 5. Are rewind-location samples and facing available? Measure beam/eruption
//    geometry, stun timing, enrage rez-invulnerability bypass and reset
//    signatures. Distinguish snapshot mistake from earlier mis-aimed beam.

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import type { ReportedOccurrence } from "@/lib/mechanics/occurrences";
import { kFmt, yd, joinNames, playerError, playerlessMinor, raidMarker, clusterByGap } from "@/lib/mechanics/wow/common";
import {
  DAMAGE_DOWN, MARK_OF_MORTALITY, DEATH_EVENT_LAG_MS, type Hit, type Life,
  buildLife, hitsOf, castsOf, uniq, namesOf, isTank, realAmount, allAlive, byPlayer,
} from "./common";

export const OOD_AVOIDABLE_RULE_ID   = "ffxiv-ood-avoidable";
export const OOD_APOCALYPSE_RULE_ID  = "ffxiv-ood-apocalypse";
export const OOD_FIRE_RULE_ID        = "ffxiv-ood-fire";
export const OOD_UNHOLY_RULE_ID      = "ffxiv-ood-unholy";
export const OOD_BLIZZARD_RULE_ID    = "ffxiv-ood-blizzard";
export const OOD_BAIT_RULE_ID        = "ffxiv-ood-bait";
export const OOD_ERUPTION_RULE_ID    = "ffxiv-ood-eruption";
export const OOD_GAZE_RULE_ID        = "ffxiv-ood-gaze";
export const OOD_WATER_RULE_ID       = "ffxiv-ood-water";
export const OOD_SHELL_RULE_ID       = "ffxiv-ood-shell-crusher";
export const OOD_SPIRIT_RULE_ID      = "ffxiv-ood-spirit-taker";
export const OOD_BUSTER_RULE_ID      = "ffxiv-ood-tank-buster";
export const OOD_WALL_RULE_ID        = "ffxiv-ood-wall";
export const OOD_ENRAGE_RULE_ID      = "ffxiv-ood-enrage";
export const OOD_CALLED_WIPE_RULE_ID = "ffxiv-ood-called-wipe";
export const OOD_COLLAPSE_RULE_ID    = "ffxiv-ood-collapse";

// ── log IDs (VERIFIED above) ────────────────────────────────────────────────

const HELLS_JUDGMENT = 40265;
const RELATIVITY     = 40266;
const REFRAIN        = 40269;                // Spell-in-Waiting Refrain cast
const SIGNATURE      = [HELLS_JUDGMENT, RELATIVITY];
// Spell-in-Waiting statuses; each apply carries its timer as `durationMs`.
const W_FIRE     = 1002455;
const W_UNHOLY   = 1002454;
const W_BLIZZARD = 1002462;
const W_WATER    = 1002461;
const W_ERUPTION = 1002460;
const W_EYE      = 1002456;
const RETURN     = 1002452;                  // the rewind: removed when it pulls its holder back
// Resolutions.
const DARK_FIRE     = 40276;
const UNHOLY        = 40277;
const DARK_BLIZZARD = 40279;
const DARK_WATER    = 40271;
const DARK_ERUPTION = 40274;
const SHADOWEYE     = 40278;
const DOOM          = 1002516;
const BAIT          = 40235;                 // Sinbound Meltdown: the first shot at the nearest player
const BEAM          = 40292;                 // Sinbound Meltdown: the rotating follow-up shots
const SHELL_CRUSHER = 40287;
const SPIRIT_TAKER  = 40289;
const BLACK_HALO    = 40290;
const DANCE_BUSTER  = 40182;                 // Darkest Dance: the jump on the farthest player
const DANCE_KNOCK   = 40183;                 // Darkest Dance: the raid-wide knockback
const APOCALYPSE    = 40297;
const MEMORYS_END_CAST = 40300;
const MEMORYS_END_PASS = 40335;              // HP check met: Phase 4 follows
const MEMORYS_END_FAIL = 40336;              // enrage

// ── thresholds (with the extremes behind them) ──────────────────────────────

const EPISODE_MS = 3000;
// Hits of one resolution land within this long of its due time (scheduled
// Dark Fire damage +0.6-0.7s; a fire set off by a death in that resolution
// is cast ~0.6s after the fatal hit, so its damage lands 1.2s+ later).
const RES_BEFORE_MS = 300;
const RES_AFTER_MS  = 1000;
// A spread or fire that caught this many non-holders was carried into the
// group: only its owner is named (a fire in the Unholy stack hit 3-7 every
// time, U4 +26.2; one or two clipped is ambiguous, everyone named).
const CARRIED_INTO_GROUP = 3;
// Unholy Darkness under five gives Mark of Mortality (size 4: 8 of 8 MoM;
// size 5: 0 of 115).
const UNHOLY_MIN = 5;
// Dark Water under four gives Mark of Mortality (size 3: 31 of 36 MoM;
// size 4: 0 of 184).
const WATER_MIN = 4;
// A Blizzard donut that hit this many stood its holder away from the stack
// (V20 +36.8 five hit, all died; one or two hit = they left the donut).
const BLIZZARD_HOLDER_MIN = 3;
// This many in one Apocalypse wave is the group reading it wrong.
const APOC_GROUP = 4;
// No-killing-blow deaths: Darkest Dance's knockback lands 2.7-3.8s before
// the death event (R8, V3), Spirit Taker's 3.3-3.8s.
const KNOCK_MIN_MS = 2000;
const KNOCK_MAX_MS = 5000;
// Doom (looking at a Shadoweye) kills ~5s after it lands; the death event
// follows its expiry by ~2.1s (R26 +58.7 / +63.7 / +65.8).
const DOOM_DEATH_MS = 9000;
const DD_RESET_MS          = 36_000;
const RESET_AFTER_DEATH_MS = 8000;
const SILENT_HIT_MS        = 3500;
const CALLED_WIPE_COUNT    = 3;
const CALLED_WIPE_WINDOW   = 10_000;
const CALLED_WIPE_END_MS   = 12_000;
const CALLED_WIPE_RAID_DEAD = 4;
// Four dead at once never came back: none of the six P3 clears had more
// than one down before Memory's End, and every pull that reached four
// failed (Q14: one dead from Refrain on, enraged).
const COLLAPSE_DEAD_COUNT  = 4;

// ── helpers ─────────────────────────────────────────────────────────────────

const instKey = (e: PlayerEvent) => `${e.source}#${e.sourceInstance}`;
const castKey = (c: EnemyEvent) => `${c.actorName}#${c.sourceInstance}`;
const instancesOf = (hits: Hit[]) => {
  const m = new Map<string, Hit[]>();
  for (const h of hits) m.set(instKey(h.e), [...(m.get(instKey(h.e)) ?? []), h]);
  return m;
};
const playersOf = (hits: Hit[]) => uniq(hits.map((h) => h.p));
const diedIn = (life: Life, hits: Hit[]) => uniq(hits.filter((h) => life.diedFrom(h.p, h.e.timestamp)).map((h) => h.p));
const momIn = (players: PlayerInfo[], cause: number, t: number) =>
  players.filter((p) => p.debuffs.some((e) => e.abilityId === MARK_OF_MORTALITY && e.debuffStatus === "applied" && e.causeAbilityId === cause && Math.abs(e.timestamp - t) <= 2000));

/** A Spell-in-Waiting status: who holds it and when it resolves. */
type Waiting = { p: PlayerInfo; due: number; dur: number };

/** Spell-in-Waiting `id` applied in [from, to], with its resolution time (apply + duration). */
function waitingOf(players: PlayerInfo[], id: number, from: number, to: number): Waiting[] {
  const out: Waiting[] = [];
  for (const p of players) {
    for (const e of p.debuffs) {
      if (e.abilityId !== id || e.debuffStatus !== "applied" || e.timestamp < from || e.timestamp > to) continue;
      // Older captures carry no duration: the removal stands in (an expiry,
      // unless the holder died first).
      const dur = e.durationMs ?? ((p.debuffs.find((x) => x.abilityId === id && x.debuffStatus === "removed" && x.timestamp > e.timestamp)?.timestamp ?? e.timestamp) - e.timestamp);
      out.push({ p, due: e.timestamp + dur, dur });
    }
  }
  return out;
}

/** Holders grouped by resolution time (within 1s). */
const byDue = (ws: Waiting[]) => clusterByGap(ws, (w) => w.due, 1000).map((g) => ({ t: g[0].due, holders: uniq(g.map((w) => w.p)) }));

/** Hits of `id` belonging to the resolution due at `t` (cast in [t-300, t+400]), on the living. */
function resolutionHits(players: PlayerInfo[], life: Life, casts: EnemyEvent[], id: number, t: number, end: number): Hit[] {
  const keys = new Set(casts.filter((c) => c.abilityId === id && c.timestamp >= t - RES_BEFORE_MS && c.timestamp <= t + 400).map(castKey));
  return hitsOf(players, life, id, end).filter((h) => h.e.timestamp >= t - RES_BEFORE_MS && h.e.timestamp <= t + RES_AFTER_MS + 500 && (keys.size === 0 || keys.has(instKey(h.e))));
}

/** The cast that dealt an instance's hits, when FFLogs kept its target (it drops it when the hit landed on several players). */
const castOf = (casts: EnemyEvent[], id: number, hs: Hit[]) =>
  casts.find((c) => c.abilityId === id && castKey(c) === instKey(hs[0].e) && c.timestamp >= hs[0].e.timestamp - 1500 && c.timestamp <= hs[0].e.timestamp + 100);

// ── personal spreads: Dark Fire III and the rewind's Dark Eruption ──────────

type Spread = { id: number; name: string; why: string };
const FIRE: Spread = { id: DARK_FIRE, name: "Dark Fire III",
  why: "Dark Fire III is a large spread on its holder: fire holders stand out at their own light, away from the Unholy Darkness stack and from each other." };
const ERUPTION_REWIND: Spread = { id: DARK_ERUPTION, name: "Dark Eruption",
  why: "After the rewind each Dark Eruption goes off where its holder's Return snapshot was: the four Eruption holders snapshot outside, near their own light and apart from the Water stack." };

/**
 * One resolution of a personal spread whose holders are known. Clean: every
 * holder hit once by their own, nobody else hit (743 of 838 owned fires).
 * The owner of an instance is its cast target, else the holders it hit (the
 * target is dropped when it hit several). An instance that caught
 * CARRIED_INTO_GROUP+ non-holders names only its owner(s); otherwise the
 * owners and everyone caught are named.
 */
function judgeSpread(sp: Spread, players: PlayerInfo[], life: Life, casts: EnemyEvent[], t: number, holders: PlayerInfo[], end: number, ruleId: string, phrase: string): PullError[] {
  const errors: PullError[] = [];
  const hits = resolutionHits(players, life, casts, sp.id, t, end);
  if (!hits.length) return errors;
  const blamed = new Map<PlayerInfo, string[]>();
  const add = (p: PlayerInfo, s: string) => blamed.set(p, [...(blamed.get(p) ?? []), s]);
  const involved: Hit[] = [];
  for (const [, hs] of instancesOf(hits)) {
    const hit = playersOf(hs);
    const target = castOf(casts, sp.id, hs)?.target;
    const owners = target ? hit.filter((p) => p.name === target) : hit.filter((p) => holders.includes(p));
    // Two holders in one untargeted instance stood together: each one's
    // own went off on the other (L12 +26.2, both died).
    if (!target && owners.length > 1) {
      involved.push(...hs);
      for (const o of owners) add(o, `stood with ${namesOf(owners.filter((x) => x !== o))}, who also held one, so their ${sp.name}s hit each other${hit.length > owners.length ? ` and ${namesOf(hit.filter((x) => !owners.includes(x)))}` : ""}`);
      continue;
    }
    const caught = hit.filter((p) => !owners.includes(p));
    if (!caught.length || !owners.length) continue;
    involved.push(...hs);
    const outsiders = caught.filter((p) => !holders.includes(p));
    for (const o of owners) add(o, `their ${sp.name} hit ${namesOf(caught)}`);
    if (outsiders.length < CARRIED_INTO_GROUP) for (const c of caught) add(c, `was caught in ${namesOf(owners)}'s ${sp.name}`);
  }
  if (!blamed.size) return errors;
  const killed = diedIn(life, involved);
  for (const [p, what] of blamed) {
    errors.push(playerError(p, {
      ruleId, severity: killed.length ? "Major" : "Minor", name: `${sp.name} Overlap`,
      description: `${phrase}: ${uniq(what).join("; ")}.${killed.length ? ` ${namesOf(killed)} died.` : ""} ${sp.why}`,
      timestamp: t, abilityId: sp.id, abilityName: sp.name,
    }));
  }
  return errors;
}

// ── Ultimate Relativity ─────────────────────────────────────────────────────

type Relativity = {
  cast: EnemyEvent;
  fires: Waiting[]; unholy: Waiting[]; blizzard: Waiting[];
  water: Waiting[]; eruption: Waiting[]; eyes: Waiting[];
  rewind: number;                            // the delayed Water / Eruption / eye resolution
};

function relativityOf(players: PlayerInfo[], casts: EnemyEvent[], end: number): Relativity | undefined {
  const cast = castsOf(casts, RELATIVITY, end)[0];
  if (!cast) return undefined;
  const from = cast.timestamp, to = cast.timestamp + 5000;
  const r = {
    cast,
    fires: waitingOf(players, W_FIRE, from, to), unholy: waitingOf(players, W_UNHOLY, from, to),
    blizzard: waitingOf(players, W_BLIZZARD, from, to), water: waitingOf(players, W_WATER, from, to),
    eruption: waitingOf(players, W_ERUPTION, from, to), eyes: waitingOf(players, W_EYE, from, to),
  };
  const rewind = [...r.water, ...r.eruption, ...r.eyes].map((w) => w.due).sort((a, b) => a - b)[0];
  return rewind === undefined ? undefined : { ...r, rewind };
}

/**
 * Dark Fire III at 10/20/30s (the waiting status lasts 11/21/31s). A fire
 * that caught others is the error; a fire set off by its holder's death is
 * cast untargeted ~0.1s after the fatal hit and is fallout (V5 +31.9).
 */
function detectFires(players: PlayerInfo[], life: Life, casts: EnemyEvent[], ur: Relativity, end: number): PullError[] {
  return byDue(ur.fires).flatMap(({ t, holders }) =>
    judgeSpread(FIRE, players, life, casts, t, holders, end, OOD_FIRE_RULE_ID, `Relativity's ${Math.round((t - ur.cast.timestamp) / 10_000) * 10}s fires`));
}

/**
 * A player who dies holding a Dark Fire III sets it off on their body at
 * once (cast untargeted ~0.1s after the fatal hit). In a stack that killed
 * more players, and their pending fires went off in turn: most Relativity
 * wipes are this cascade (V5, G12, O28). The first death is flagged by its
 * own cause where one exists (a doubled bait, a beam); a baiter at ~0%
 * after a single bait (J15, G12) or a death to the raidwide right after
 * Hell's Judgment (O28, T6) is not. One
 * player-less error per chain of released fires (within 3s of each other)
 * that hit someone else.
 */
function detectReleasedFires(players: PlayerInfo[], life: Life, casts: EnemyEvent[], deaths: DeathEvent[], ur: Relativity, end: number): PullError[] {
  const errors: PullError[] = [];
  const scheduled = (t: number) => ur.fires.some((w) => t >= w.due - RES_BEFORE_MS && t <= w.due + 400);
  const released = castsOf(casts, DARK_FIRE, end).filter((x) => x.timestamp > ur.cast.timestamp && !scheduled(x.timestamp));
  for (const chain of clusterByGap(released, (c) => c.timestamp, 3000)) {
    const hs = hitsOf(players, life, DARK_FIRE, end).filter((h) => chain.some((c) => instKey(h.e) === castKey(c) && h.e.timestamp >= c.timestamp && h.e.timestamp - c.timestamp <= 1500));
    const holders = uniq(chain.flatMap((c) => ur.fires.filter((w) => w.due > c.timestamp && deaths.some((d) => d.player === w.p.name && d.timestamp >= c.timestamp && d.timestamp - c.timestamp <= DEATH_EVENT_LAG_MS + 800)).map((w) => w.p)));
    const hit = playersOf(hs).filter((p) => !holders.includes(p) || hs.some((h) => h.p === p && life.diedFrom(p, h.e.timestamp)));
    if (!hit.length) continue;
    const killed = diedIn(life, hs);
    errors.push(playerlessMinor(OOD_FIRE_RULE_ID, "Dark Fire III Released by a Death",
      `${holders.length ? `${namesOf(holders)} died holding ${holders.length > 1 ? "Dark Fire IIIs" : "a Dark Fire III"}` : "A player died holding a Dark Fire III"}, which went off on the spot${chain.length > 1 ? ` (${chain.length} fires in a chain)` : ""} and hit ${namesOf(hit)}${killed.length ? `; ${namesOf(killed)} died` : ""}. A fire holder's death sets their fire off at once, so a death near the stack cascades.`,
      chain[0].timestamp, DARK_FIRE, "Dark Fire III"));
  }
  return errors;
}

/**
 * Unholy Darkness at 10/20/30s is soaked by everyone without a fire at that
 * timer (289 of 296 resolutions with all eight alive had nobody missing);
 * under five gives Mark of Mortality. With all eight alive a missing
 * player is named, Major when the stack came up short.
 */
function detectUnholy(players: PlayerInfo[], life: Life, casts: EnemyEvent[], ur: Relativity, end: number): PullError[] {
  const errors: PullError[] = [];
  for (const { t, holders } of byDue(ur.unholy)) {
    if (!allAlive(players, life, t - 500)) continue;
    const hits = resolutionHits(players, life, casts, UNHOLY, t, end);
    if (!hits.length) continue;
    const fire = ur.fires.filter((w) => Math.abs(w.due - t) < 1000).map((w) => w.p);
    const soaked = playersOf(hits);
    const missing = players.filter((p) => !fire.includes(p) && !soaked.includes(p));
    const mom = momIn(players, UNHOLY, t + 700);
    const short = soaked.length < UNHOLY_MIN;
    for (const p of missing) {
      errors.push(playerError(p, {
        ruleId: OOD_UNHOLY_RULE_ID, severity: short || mom.length ? "Major" : "Minor", name: "Missed Unholy Darkness",
        description: `Had no fire at this timer but wasn't in the Unholy Darkness stack on ${namesOf(holders)}; ${soaked.length} took it${short ? `, under the five it needs` : ""}.${mom.length ? ` ${namesOf(mom)} got Mark of Mortality.` : ""} Everyone without a fire at that timer (the Blizzard holder too) stacks on the Unholy Darkness marker.`,
        timestamp: t, abilityId: UNHOLY, abilityName: "Unholy Darkness",
      }));
    }
  }
  return errors;
}

/**
 * Dark Blizzard III is a donut on its holder, who stays in the 20s stack.
 * Every hit gives Damage Down (and killed in every sample). Three or more
 * hit means the holder stood away from the stack's middle: the holder is
 * named. One or two hit left the donut's safe middle: they are named.
 */
function detectBlizzard(players: PlayerInfo[], life: Life, casts: EnemyEvent[], ur: Relativity, end: number): PullError[] {
  const errors: PullError[] = [];
  for (const { t, holders } of byDue(ur.blizzard)) {
    const hits = resolutionHits(players, life, casts, DARK_BLIZZARD, t, end);
    const victims = playersOf(hits).filter((p) => !holders.includes(p));
    if (!victims.length) continue;
    const killed = diedIn(life, hits);
    const outcome = `${killed.length ? ` ${namesOf(killed)} died.` : ""}`;
    const why = "Dark Blizzard III is a donut around its holder: the holder stands in the middle of the 20s Unholy Darkness stack so the stack is inside the safe center.";
    const culprits = victims.length >= BLIZZARD_HOLDER_MIN ? holders : victims;
    for (const p of culprits) {
      const holder = holders.includes(p);
      errors.push(playerError(p, {
        ruleId: OOD_BLIZZARD_RULE_ID, severity: "Major", name: holder ? "Dark Blizzard III on the Stack" : "Hit by Dark Blizzard III",
        description: holder
          ? `Held Dark Blizzard III but stood off the stack's middle: the donut hit ${namesOf(victims)} with Damage Down.${outcome} ${why}`
          : `Stood outside the safe middle of ${namesOf(holders)}'s Dark Blizzard III donut: hit, Damage Down.${outcome} ${why}`,
        timestamp: t, abilityId: DARK_BLIZZARD, abilityName: "Dark Blizzard III",
      }));
    }
  }
  return errors;
}

/**
 * Sinbound Meltdown's first shot from each hourglass goes through the
 * nearest player in a line (clean: one player per shot, 750 of 773). A
 * shot that hit several names everyone in it: the baiter (the cast target,
 * else the hit player nearest the hourglass) and whoever stood in the line.
 * A line through CARRIED_INTO_GROUP+ others names the baiter only.
 */
function detectBaits(players: PlayerInfo[], life: Life, casts: EnemyEvent[], start: number, end: number): PullError[] {
  const errors: PullError[] = [];
  const hits = hitsOf(players, life, BAIT, end).filter((h) => h.e.timestamp >= start);
  for (const [, hs] of instancesOf(hits)) {
    for (const res of clusterByGap(hs, (h) => h.e.timestamp, 1000)) {
      const hit = playersOf(res);
      if (hit.length < 2) continue;
      const cast = castOf(casts, BAIT, res);
      const dist = (h: Hit) => (cast?.x === undefined || h.e.x === undefined ? Infinity : Math.hypot(h.e.x - cast.x, (h.e.y ?? 0) - (cast.y ?? 0)));
      const baiter = cast?.target ? hit.find((p) => p.name === cast.target) : [...res].sort((a, b) => dist(a) - dist(b))[0]?.p;
      const killed = diedIn(life, res);
      // A line through three or more went through the group: the baiter aimed it there.
      const named = baiter && hit.length - 1 >= CARRIED_INTO_GROUP ? [baiter] : hit;
      for (const p of named) {
        const own = p === baiter;
        const d = res.find((h) => h.p === p);
        errors.push(playerError(p, {
          ruleId: OOD_BAIT_RULE_ID, severity: killed.length ? "Major" : "Minor", name: "Sinbound Meltdown Line",
          description: `${own ? `Baited an hourglass's Sinbound Meltdown and its line went through ${namesOf(hit.filter((x) => x !== p))}` : `Stood in the line of the Sinbound Meltdown ${baiter ? `${baiter.name} baited` : "another player baited"}`}${d && cast?.x !== undefined && d.e.x !== undefined ? ` (~${yd(dist(d))} yalms from the hourglass)` : ""}.${killed.length ? ` ${namesOf(killed)} died.` : ""} The first shot hits everyone in a line through the nearest player: bait it across the middle with nobody behind you.`,
          timestamp: res[0].e.timestamp, abilityId: BAIT, abilityName: "Sinbound Meltdown",
        }));
      }
    }
  }
  return errors;
}

/**
 * The rewind (43s): Dark Water on its holder plus the three Shadoweye
 * holders (a four-stack), four Dark Eruptions, three gazes. Missing a
 * Water you were due in is named; Eruption overlaps are judgeSpread's;
 * Doom from a gaze is detectGaze's.
 */
function detectRewind(players: PlayerInfo[], life: Life, casts: EnemyEvent[], ur: Relativity, end: number): PullError[] {
  const errors: PullError[] = [];
  const t = ur.rewind;
  errors.push(...judgeSpread(ERUPTION_REWIND, players, life, casts, t, ur.eruption.map((w) => w.p), end, OOD_ERUPTION_RULE_ID, "After the rewind"));
  if (!allAlive(players, life, t - 500)) return errors;
  const hits = resolutionHits(players, life, casts, DARK_WATER, t, end);
  if (!hits.length) return errors;
  const soaked = playersOf(hits);
  const expected = uniq([...ur.water, ...ur.eyes].map((w) => w.p));
  const missing = expected.filter((p) => !soaked.includes(p));
  const mom = momIn(players, DARK_WATER, t + 700);
  const killed = diedIn(life, hits);
  const short = Math.max(...[...instancesOf(hits).values()].map((hs) => playersOf(hs).length)) < WATER_MIN;
  for (const p of missing) {
    errors.push(playerError(p, {
      ruleId: OOD_WATER_RULE_ID, severity: short || mom.length || killed.length ? "Major" : "Minor", name: "Missed the Rewind Water",
      description: `Held ${ur.eyes.some((w) => w.p === p) ? "Shadoweye" : "Dark Water III"} but wasn't in the Dark Water stack after the rewind; ${soaked.length} took it.${mom.length ? ` ${namesOf(mom)} got Mark of Mortality.` : ""}${killed.length ? ` ${namesOf(killed)} died.` : ""} The Water and three Shadoweye holders snapshot their Return together near the middle.`,
      timestamp: t, abilityId: DARK_WATER, abilityName: "Dark Water III",
    }));
  }
  return errors;
}

/**
 * Looking at a Shadoweye at the rewind gives Doom (54 applications), which
 * no one cleansed and killed ~5s later every time. Several applications =
 * several eyes. An eye holder facing another eye counts too.
 */
function detectGaze(players: PlayerInfo[], life: Life, ur: Relativity, end: number): PullError[] {
  const errors: PullError[] = [];
  for (const p of players) {
    const dooms = p.debuffs.filter((e) => e.abilityId === DOOM && e.debuffStatus === "applied" && e.timestamp >= ur.rewind - 500 && e.timestamp <= Math.min(end, ur.rewind + 3000));
    if (!dooms.length || !life.alive(p, dooms[0].timestamp - 500)) continue;
    const eyes = new Set(dooms.map((e) => e.timestamp)).size;
    const eyeHolder = ur.eyes.some((w) => w.p === p);
    errors.push(playerError(p, {
      ruleId: OOD_GAZE_RULE_ID, severity: "Major", name: "Looked at Shadoweye",
      description: `${eyeHolder ? "Held a Shadoweye but faced" : "Faced"} ${eyes > 1 ? `${eyes} Shadoweyes` : "a Shadoweye"} when the rewind resolved: Doom, which kills ~5s later. Before the Return stun everyone turns to face out, eye holders included.`,
      timestamp: dooms[0].timestamp, abilityId: SHADOWEYE, abilityName: "Shadoweye",
    }));
  }
  return errors;
}

// ── plain avoidable hits ────────────────────────────────────────────────────

/**
 * Sinbound Meltdown's follow-up shots sweep from each hourglass: being in
 * one is avoidable (no Damage Down; it killed in 44 of 47 cases with all
 * eight alive, so it is Major when it killed). One shot that hit APOC_GROUP+
 * swept through the whole stack (V12 +34.0, seven at once): one
 * player-less error.
 */
function detectBeams(players: PlayerInfo[], life: Life, start: number, end: number): PullError[] {
  const errors: PullError[] = [];
  const individual: Hit[] = [];
  for (const shot of clusterByGap(hitsOf(players, life, BEAM, end).filter((h) => h.e.timestamp >= start), (h) => h.e.timestamp, 300)) {
    const hit = playersOf(shot);
    if (hit.length < APOC_GROUP) { individual.push(...shot); continue; }
    const killed = diedIn(life, shot);
    errors.push(playerlessMinor(OOD_AVOIDABLE_RULE_ID, "Sinbound Meltdown Through the Group",
      `One follow-up Sinbound Meltdown shot hit ${hit.length} players at once (${namesOf(hit)})${killed.length ? `; ${namesOf(killed)} died` : ""}: the group stood in a beam's sweep. Each beam rotates around its hourglass after the first shot; keep the group out of its path.`,
      shot[0].e.timestamp, BEAM, "Sinbound Meltdown"));
  }
  for (const [p, es] of byPlayer(individual)) {
    for (const g of clusterByGap(es, (e) => e.timestamp, EPISODE_MS)) {
      const death = life.diedFrom(p, g[g.length - 1].timestamp);
      errors.push(playerError(p, {
        ruleId: OOD_AVOIDABLE_RULE_ID, severity: death ? "Major" : "Minor", name: "Hit by Sinbound Meltdown",
        description: `Hit by an hourglass's follow-up Sinbound Meltdown shot (${g.length > 1 ? `${g.length} hits, ` : ""}${kFmt(g.reduce((s, e) => s + realAmount(e), 0))})${death ? " and died" : ""}. After the first shot, each beam rotates around its hourglass: move around your own light away from its spin.`,
        timestamp: g[0].timestamp, abilityId: BEAM, abilityName: "Sinbound Meltdown",
      }));
    }
  }
  return errors;
}

/**
 * Apocalypse: six waves of explosions, every hit a Damage Down. A wave that
 * hit APOC_GROUP+ players is the group misreading the rotation: one
 * player-less error. Otherwise each player hit is Major.
 */
function detectApocalypse(players: PlayerInfo[], life: Life, start: number, end: number): PullError[] {
  const errors: PullError[] = [];
  const why = "Apocalypse's lights explode in six waves rotating from where they start: stand one marker opposite the rotation, then move in behind the explosions.";
  const individual: Hit[] = [];
  for (const wave of clusterByGap(hitsOf(players, life, APOCALYPSE, end).filter((h) => h.e.timestamp >= start), (h) => h.e.timestamp, 1000)) {
    const hit = playersOf(wave);
    if (hit.length < APOC_GROUP) { individual.push(...wave); continue; }
    const killed = diedIn(life, wave);
    errors.push(playerlessMinor(OOD_APOCALYPSE_RULE_ID, "Group in Apocalypse",
      `${hit.length} players were hit by the same Apocalypse wave (${namesOf(hit)}), all with Damage Down${killed.length ? `; ${namesOf(killed)} died` : ""}: the group stood in the explosions' path. ${why}`,
      wave[0].e.timestamp, APOCALYPSE, "Apocalypse"));
  }
  for (const [p, es] of byPlayer(individual)) {
    for (const g of clusterByGap(es, (e) => e.timestamp, EPISODE_MS)) {
      const death = life.diedFrom(p, g[g.length - 1].timestamp);
      errors.push(playerError(p, {
        ruleId: OOD_APOCALYPSE_RULE_ID, severity: "Major", name: "Hit by Apocalypse",
        description: `Hit by Apocalypse (${g.length > 1 ? `${g.length} hits, ` : ""}${kFmt(g.reduce((s, e) => s + realAmount(e), 0))}): Damage Down${death ? ", and died" : ""}. ${why}`,
        timestamp: g[0].timestamp, abilityId: APOCALYPSE, abilityName: "Apocalypse",
      }));
    }
  }
  return errors;
}

/**
 * Apocalypse's Dark Eruption is a spread on all eight (clean: eight hits,
 * nobody twice, 26 resolutions). FFLogs merges some copies' instances, so
 * overlaps are read per player: everyone hit twice or more is named.
 */
function detectApocEruptions(players: PlayerInfo[], life: Life, start: number, end: number): PullError[] {
  const errors: PullError[] = [];
  for (const res of clusterByGap(hitsOf(players, life, DARK_ERUPTION, end).filter((h) => h.e.timestamp >= start), (h) => h.e.timestamp, 1000)) {
    const per = byPlayer(res);
    const doubled = [...per].filter(([, es]) => new Set(es.map((e) => e.timestamp)).size > 1 || es.length > 1);
    if (!doubled.length) continue;
    const killed = diedIn(life, res);
    for (const [p, es] of doubled) {
      errors.push(playerError(p, {
        ruleId: OOD_ERUPTION_RULE_ID, severity: killed.length ? "Major" : "Minor", name: "Dark Eruption Overlap",
        description: `Took ${es.length} Dark Eruptions in Apocalypse (${kFmt(es.reduce((s, e) => s + realAmount(e), 0))})${doubled.length > 1 ? ` along with ${namesOf(doubled.map(([x]) => x).filter((x) => x !== p))}` : ""}.${killed.length ? ` ${namesOf(killed)} died.` : ""} Everyone has a Dark Eruption spread with the second explosion wave: spread in your own spot.`,
        timestamp: res[0].e.timestamp, abilityId: DARK_ERUPTION, abilityName: "Dark Eruption",
      }));
    }
  }
  return errors;
}

// ── Water stacks in Spell-in-Waiting Refrain ────────────────────────────────

/**
 * Refrain gives two players each a 10s, 29s and 38s Dark Water; two get
 * none. Each Water is two four-stacks, and each group of four needs one of
 * each timer and one with none (56 of 58 clean 4/4 resolutions). With all
 * eight alive:
 * - both Waters of a timer in one group (W7 +125.7, five took both
 *   and died): both holders are named; one of them had to flex.
 * - a short stack with someone in no stack: that player is named.
 * - a short stack with nobody missing: the extra player stood in the other
 *   group; its members whose timer another member shares are named.
 */
function detectRefrainWater(players: PlayerInfo[], life: Life, casts: EnemyEvent[], start: number, end: number): PullError[] {
  const errors: PullError[] = [];
  const refrain = castsOf(casts, REFRAIN, end).find((c) => c.timestamp >= start);
  if (!refrain) return errors;
  const waters = waitingOf(players, W_WATER, refrain.timestamp, refrain.timestamp + 15_000);
  const timer = (p: PlayerInfo) => { const w = waters.find((x) => x.p === p); return w ? `${Math.round(w.dur / 1000)}s` : "none"; };
  const why = "Each Water stack of four needs one player of each Water timer (10s, 29s, 38s) and one without: when both of a timer are in one group, one flexes to the other.";
  for (const { t, holders } of byDue(waters)) {
    if (!allAlive(players, life, t - 500)) continue;
    const hits = resolutionHits(players, life, casts, DARK_WATER, t, end);
    if (!hits.length) continue;
    const stacks = [...instancesOf(hits).values()].map(playersOf);
    const mom = momIn(players, DARK_WATER, t + 700);
    const killed = diedIn(life, hits);
    const sev = mom.length || killed.length ? "Major" : "Minor";
    const outcome = `${mom.length ? ` ${namesOf(mom)} got Mark of Mortality.` : ""}${killed.length ? ` ${namesOf(killed)} died.` : ""}`;
    const err = (p: PlayerInfo, name: string, description: string) =>
      errors.push(playerError(p, { ruleId: OOD_WATER_RULE_ID, severity: sev, name, description: `${description}${outcome} ${why}`, timestamp: t, abilityId: DARK_WATER, abilityName: "Dark Water III" }));
    const together = holders.length === 2 && stacks.some((s) => holders.every((h) => s.includes(h)));
    if (together) {
      const both = stacks.filter((s) => holders.every((h) => s.includes(h))).flat();
      for (const h of holders) err(h, "Water Holders Together", `Held a ${timer(h)} Dark Water and stood in the same group as ${namesOf(holders.filter((x) => x !== h))}, who had the other: both Waters hit ${namesOf(uniq(both))}.`);
      continue;
    }
    const soaked = uniq(stacks.flat());
    const missing = players.filter((p) => !soaked.includes(p));
    const short = stacks.filter((s) => s.length < WATER_MIN);
    for (const p of missing) err(p, "Missed Dark Water", `Wasn't in either Dark Water stack (${timer(p)} Water)${short.length ? `, so ${namesOf(short.flat())} took one short` : ""}.`);
    if (short.length && !missing.length) {
      for (const big of stacks.filter((s) => s.length > WATER_MIN)) {
        const dup = big.filter((p) => !holders.includes(p) && big.some((q) => q !== p && timer(q) === timer(p)));
        for (const p of dup) err(p, "Wrong Water Group", `Stood in the ${big.length}-player Water stack with another ${timer(p) === "none" ? "player without a Water" : `${timer(p)} Water`} (${namesOf(dup.filter((x) => x !== p && timer(x) === timer(p)))}) while ${namesOf(short.flat())} took the other short: one of them belonged there.`);
      }
    }
    const doubled = [...byPlayer(hits)].filter(([, es]) => new Set(es.map(instKey)).size > 1).map(([p]) => p);
    for (const p of doubled.filter((x) => !missing.includes(x))) err(p, "Doubled Dark Water", "Stood in both Dark Water stacks at once.");
  }
  return errors;
}

// ── Shell Crusher, Spirit Taker, busters ────────────────────────────────────

/** Shell Crusher is a whole-party stack: with all eight alive, a living player outside it is named. */
function detectShellCrusher(players: PlayerInfo[], life: Life, start: number, end: number): PullError[] {
  const errors: PullError[] = [];
  for (const res of clusterByGap(hitsOf(players, life, SHELL_CRUSHER, end).filter((h) => h.e.timestamp >= start), (h) => h.e.timestamp, 1500)) {
    const t = res[0].e.timestamp;
    if (!allAlive(players, life, t - 500)) continue;
    const soaked = playersOf(res);
    const killed = diedIn(life, res);
    for (const p of players.filter((x) => !soaked.includes(x))) {
      errors.push(playerError(p, {
        ruleId: OOD_SHELL_RULE_ID, severity: killed.length ? "Major" : "Minor", name: "Missed Shell Crusher",
        description: `Wasn't in the Shell Crusher stack (${soaked.length} took it).${killed.length ? ` ${namesOf(killed)} died.` : ""} Shell Crusher is one stack for all eight.`,
        timestamp: t, abilityId: SHELL_CRUSHER, abilityName: "Shell Crusher",
      }));
    }
  }
  return errors;
}

/**
 * Spirit Taker jumps on a random player; anyone near them is hit and
 * knocked toward the wall (14 of 51 resolutions hit two to four). The
 * cast keeps its target only when one player was hit, so everyone in a
 * shared one is named. Knocked-into-the-wall deaths (3.3-3.8s later, no
 * killing blow) count as deaths here.
 */
function detectSpiritTaker(players: PlayerInfo[], life: Life, casts: EnemyEvent[], deaths: DeathEvent[], start: number, end: number): PullError[] {
  const errors: PullError[] = [];
  for (const res of clusterByGap(hitsOf(players, life, SPIRIT_TAKER, end).filter((h) => h.e.timestamp >= start), (h) => h.e.timestamp, 1500)) {
    const hit = playersOf(res);
    if (hit.length < 2) continue;
    const t = res[0].e.timestamp;
    const target = castOf(casts, SPIRIT_TAKER, res)?.target;
    const dead = hit.filter((p) => deaths.some((d) => d.player === p.name && d.timestamp >= t && d.timestamp - t <= KNOCK_MAX_MS + 1000));
    for (const p of target ? hit.filter((x) => x.name !== target) : hit) {
      errors.push(playerError(p, {
        ruleId: OOD_SPIRIT_RULE_ID, severity: dead.length ? "Major" : "Minor", name: "Shared Spirit Taker",
        description: `${target ? `Stood too close to ${target}, Spirit Taker's target` : `Shared a Spirit Taker with ${namesOf(hit.filter((x) => x !== p))}`}: hit and knocked back.${dead.length ? ` ${namesOf(dead)} died${dead.length && !res.some((h) => life.diedFrom(h.p, h.e.timestamp)) ? " (knocked into the wall)" : ""}.` : ""} Spirit Taker jumps on a random player: keep your own spread spot so it lands on one.`,
        timestamp: t, abilityId: SPIRIT_TAKER, abilityName: "Spirit Taker",
      }));
    }
  }
  return errors;
}

/**
 * Black Halo (a cone on the tanks) and Darkest Dance (a jump on the
 * farthest player, which the tank baits): a non-tank hit stood in the cone,
 * stood with the tank, or was farther out than the tank. Fallout when both
 * tanks were dead. Exposure: the non-tanks at each cast.
 */
function detectBusters(players: PlayerInfo[], life: Life, casts: EnemyEvent[], start: number, end: number, occurrences?: ReportedOccurrence[]): PullError[] {
  const errors: PullError[] = [];
  const tanks = players.filter(isTank);
  for (const [id, name, why] of [
    [BLACK_HALO, "Black Halo", "Black Halo is a cone on the tanks: everyone else stays out of its path."],
    [DANCE_BUSTER, "Darkest Dance", "Darkest Dance jumps on the farthest player: the tank goes out to bait it and everyone else stays closer than them."],
  ] as [number, string, string][]) {
    for (const res of clusterByGap(hitsOf(players, life, id, end).filter((h) => h.e.timestamp >= start), (h) => h.e.timestamp, 1500)) {
      const t = res[0].e.timestamp;
      occurrences?.push({ mechanicKey: OOD_BUSTER_RULE_ID, timestamp: t, players: players.filter((p) => !isTank(p)).map((p) => p.name) });
      if (!tanks.some((p) => life.alive(p, t - 500))) continue;
      const tankHit = res.some((h) => isTank(h.p));
      for (const h of res.filter((x) => !isTank(x.p))) {
        const death = life.diedFrom(h.p, h.e.timestamp);
        errors.push(playerError(h.p, {
          ruleId: OOD_BUSTER_RULE_ID, severity: death ? "Major" : "Minor", name: `Hit by ${name}`,
          description: `${id === DANCE_BUSTER && !tankHit ? "Was the farthest player and took" : "Was hit by"} ${name} (${kFmt(realAmount(h.e))})${death ? " and died" : ""}. ${why}`,
          timestamp: t, abilityId: id, abilityName: name,
        }));
      }
    }
  }
  return errors;
}

// ── deaths with no killing blow ─────────────────────────────────────────────

const playerOf = (players: PlayerInfo[], d: DeathEvent) => players.find((x) => x.name === d.player);
/** Doom from a Shadoweye killed them (detectGaze's error). */
const doomDeath = (p: PlayerInfo, d: DeathEvent) => p.debuffs.some((e) => e.abilityId === DOOM && e.debuffStatus === "applied" && e.timestamp < d.timestamp && d.timestamp - e.timestamp <= DOOM_DEATH_MS);
/** Mark of Mortality killed them at the next stack (the short stack's error). */
const markDeath = (p: PlayerInfo, d: DeathEvent) => p.debuffs.some((e) => e.abilityId === MARK_OF_MORTALITY && e.debuffStatus === "applied" && e.timestamp < d.timestamp - 3000 && d.timestamp - e.timestamp < 30_000) &&
  p.damageTaken.some((e) => (e.abilityId === DARK_WATER || e.abilityId === UNHOLY) && e.timestamp <= d.timestamp && d.timestamp - e.timestamp <= 3000);
const knockOf = (players: PlayerInfo[], d: DeathEvent) => {
  const k = players.flatMap((p) => p.damageTaken).filter((e) => (e.abilityId === DANCE_KNOCK || e.abilityId === SPIRIT_TAKER) && d.timestamp - e.timestamp >= KNOCK_MIN_MS && d.timestamp - e.timestamp <= KNOCK_MAX_MS);
  return k.sort((a, b) => b.timestamp - a.timestamp)[0];
};
const ddReset = (p: PlayerInfo, d: DeathEvent) => p.debuffs.some((e) => e.abilityId === DAMAGE_DOWN && e.debuffStatus === "applied" && e.timestamp < d.timestamp && d.timestamp - e.timestamp <= DD_RESET_MS);

/** No-killing-blow deaths that are the wipe being called: 3+ within 10s, or one at the end with half the raid dead. */
function calledWipeDeaths(players: PlayerInfo[], deaths: DeathEvent[], life: Life, pullEnd: number): Set<DeathEvent> {
  const silent = deaths.filter((d) => {
    const p = playerOf(players, d);
    return !d.killingAbilityGameId && p && !doomDeath(p, d) && !markDeath(p, d) && !knockOf(players, d);
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
 * The arena edge is a deathwall. A no-killing-blow death is (in order):
 * Doom or Mark of Mortality (their own rules), a Spirit Taker knock
 * (detectSpiritTaker), a Darkest Dance knockback into the wall (Major), a
 * voluntary reset after the player's own Damage Down, the raid resetting
 * after another death, a killing blow FFLogs dropped, or walking into it.
 */
function detectWallDeaths(players: PlayerInfo[], deaths: DeathEvent[], called: Set<DeathEvent>, start: number, end: number): PullError[] {
  const errors: PullError[] = [];
  for (const d of deaths) {
    if (d.killingAbilityGameId || called.has(d) || d.timestamp < start || d.timestamp > end + DEATH_EVENT_LAG_MS) continue;
    const p = playerOf(players, d);
    if (!p || doomDeath(p, d) || markDeath(p, d)) continue;
    const kb = knockOf(players, d);
    if (kb?.abilityId === SPIRIT_TAKER) continue;
    if (!kb && (ddReset(p, d) || deaths.some((x) => x !== d && x.player !== d.player && x.timestamp <= d.timestamp && d.timestamp - x.timestamp <= RESET_AFTER_DEATH_MS))) continue;
    if (!kb && p.damageTaken.some((e) => (e.amount ?? 0) > 0 && e.timestamp <= d.timestamp && d.timestamp - e.timestamp <= SILENT_HIT_MS)) continue;
    const knocked = kb ? deaths.filter((x) => !x.killingAbilityGameId && Math.abs(x.timestamp - d.timestamp) <= 1500).length : 0;
    // Died the moment Return pulled them back (V10 +55.8: the Stun cut short by the death).
    const returned = !kb && p.debuffs.some((e) => e.abilityId === RETURN && e.debuffStatus === "removed" && d.timestamp - e.timestamp >= 0 && d.timestamp - e.timestamp <= DEATH_EVENT_LAG_MS + 1500);
    errors.push(playerError(p, {
      ruleId: OOD_WALL_RULE_ID, severity: "Major", name: kb ? "Knocked Into the Wall" : returned ? "Returned Into the Wall" : "Walked Into the Wall",
      description: kb
        ? `Knocked into the deathwall by Darkest Dance${knocked > 1 ? ` (${knocked} players at once)` : ""}. Gaia jumps to whoever baited the far spot and knocks everyone outward from there: stand between her landing spot and the middle, close enough that the push stops short of the wall.`
        : returned
          ? "Died with no killing blow the moment Return pulled them back to their snapshot: the snapshot spot was in the deathwall. Snapshot your Return inside the arena at your assigned spot."
          : "Died with no killing blow mid-pull: walked into the deathwall at the arena's edge.",
      timestamp: kb ? kb.timestamp : d.timestamp - DEATH_EVENT_LAG_MS, abilityId: kb ? DANCE_KNOCK : 0, abilityName: kb ? "Darkest Dance" : returned ? "Return" : "Deathwall",
    }));
  }
  return errors;
}

// ── entry point ─────────────────────────────────────────────────────────────

/** Phase 3's window: Hell's Judgment (Gaia's first cast) to Memory's End passing. */
function phase3Window(casts: EnemyEvent[]): { start: number; end: number } {
  const start = casts.filter((c) => SIGNATURE.includes(c.abilityId)).reduce((m, c) => Math.min(m, c.timestamp), Infinity);
  const pass = casts.find((c) => c.abilityId === MEMORYS_END_PASS && c.timestamp > start);
  return { start, end: pass ? pass.timestamp + 2000 : Infinity };
}

/**
 * Futures Rewritten Phase 3 (Oracle of Darkness) errors. Self-gates on Hell's
 * Judgment / Ultimate Relativity, which no other fight uses; runs from Hell's
 * Judgment to Memory's End passing (Phase 4 after it).
 */
export function detectOracleOfDarknessErrors(
  players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], occurrences?: ReportedOccurrence[],
): PullError[] {
  if (!enemyCasts.some((c) => SIGNATURE.includes(c.abilityId))) return [];
  const { start, end: p4 } = phase3Window(enemyCasts);
  if (start === Infinity) return [];
  const deaths = deathEvents.filter((d) => d.timestamp <= p4);
  const life = buildLife(players, deaths);
  const lastEvent = Math.max(0, ...players.flatMap((p) => [...p.damageTaken, ...p.casts].map((e) => e.timestamp)), ...deathEvents.map((d) => d.timestamp));
  const end = Math.min(p4, lastEvent);
  const from = start - 1000;
  const p3Deaths = deaths.filter((d) => d.timestamp >= start);
  const called = calledWipeDeaths(players, p3Deaths, life, p4 === Infinity ? lastEvent : Infinity);

  const ur = relativityOf(players, enemyCasts, end);
  const errors = [
    ...(ur ? [
      ...detectFires(players, life, enemyCasts, ur, end),
      ...detectReleasedFires(players, life, enemyCasts, deaths, ur, end),
      ...detectUnholy(players, life, enemyCasts, ur, end),
      ...detectBlizzard(players, life, enemyCasts, ur, end),
      ...detectRewind(players, life, enemyCasts, ur, end),
      ...detectGaze(players, life, ur, end),
    ] : []),
    ...detectBaits(players, life, enemyCasts, from, end),
    ...detectBeams(players, life, from, end),
    ...detectShellCrusher(players, life, from, end),
    ...detectBusters(players, life, enemyCasts, from, end, occurrences),
    ...detectRefrainWater(players, life, enemyCasts, from, end),
    ...detectApocalypse(players, life, from, end),
    ...detectApocEruptions(players, life, ur ? ur.rewind + 5000 : from, end),
    ...detectSpiritTaker(players, life, enemyCasts, deaths, from, end),
    ...detectWallDeaths(players, p3Deaths, called, start, end),
  ];

  // Memory's End with Gaia at 20% or more is the enrage.
  const failCast = enemyCasts.find((c) => c.abilityId === MEMORYS_END_FAIL && c.timestamp >= start);
  if (failCast) {
    const cast = castsOf(enemyCasts, MEMORYS_END_CAST, end).pop();
    const left = cast?.hitPoints !== undefined && cast.maxHitPoints ? ` Gaia had ${(100 * cast.hitPoints / cast.maxHitPoints).toFixed(1)}% HP left.` : "";
    errors.push(raidMarker(OOD_ENRAGE_RULE_ID, "Memory's End (Enrage)",
      `Memory's End went off with Gaia at 20% or more and killed the raid. The DPS check wasn't met.${left}`,
      failCast.timestamp, MEMORYS_END_FAIL, "Memory's End"));
  }

  // Generic cutoffs, only the earliest and only before any mechanic Raid.
  const generic: PullError[] = [];
  const calledList = p3Deaths.filter((d) => called.has(d)).sort((a, b) => a.timestamp - b.timestamp);
  if (calledList.length >= CALLED_WIPE_COUNT) {
    generic.push(raidMarker(OOD_CALLED_WIPE_RULE_ID, "Wipe Called",
      `${calledList.length} players died with no killing blow (${joinNames(uniq(calledList.map((d) => d.player)))}): the wipe was called and the raid reset into the deathwall.`,
      calledList[0].timestamp - DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  if (p4 === Infinity) {
    const outAt = (t: number) => players.filter((p) => !life.alive(p, t));
    const collapseT = life.outIntervals.map((w) => w.start).filter((t) => t >= start).sort((a, b) => a - b)
      .find((t) => outAt(t).length >= COLLAPSE_DEAD_COUNT);
    if (collapseT !== undefined) {
      const who = outAt(collapseT).map((p) => p.name);
      generic.push(raidMarker(OOD_COLLAPSE_RULE_ID, "Party Collapse",
        `${who.length} players were dead at once (${joinNames(who)}). No Phase 3 pull recovered from four down; treated as the cutoff point.`,
        collapseT + DEATH_EVENT_LAG_MS, 0, "Deaths"));
    }
  }
  const firstRaid = Math.min(...errors.filter((e) => e.severity === "Raid").map((e) => e.timestamp));
  const marker = generic.sort((a, b) => a.timestamp - b.timestamp)[0];
  if (marker && marker.timestamp < firstRaid) errors.push(marker);
  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
