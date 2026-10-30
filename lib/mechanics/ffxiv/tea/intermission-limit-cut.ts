// The Epic of Alexander (Ultimate) -- Intermission: Limit Cut.
//
// -- DIGEST (read first; detail in the sections it names) --
// What: Limit Cut in the intermission. Eight head markers (numbers 1..8),
//   ten Hawk Blaster blasts (18480, two helper Cruise Chasers, 8 outer + 2
//   center), then Alpha Sword (18484) and Super Blassty Charge (19279) hit
//   numbered pairs in sequence, then J Kick (18516). Clock from the first
//   blast: markers -2.0s, swords +7.4 / 12.1 / 16.7 / 21.3, charges +8.9 /
//   13.5 / 18.2 / 22.8, J Kick +26.0. Each numbered hit applies Magic and
//   Physical Vulnerability Up (10s / 17s); no Damage Down, so avoidables are
//   Minor unless they kill. Owns Limit Cut only; BJ/CC is bj-cc.ts and J Kick
//   deaths are mitigation, not flagged.
// Rules (code ids ffxiv-lc-*):
//   ffxiv-lc-stray: Minor, Major if it killed. Hit by another number's
//     sword/charge. Exposure: everyone.
//   ffxiv-lc-aim: Minor/Major by extras' deaths. Holder whose sword hit
//     someone else while more than 60 degrees off the clockwise track, or
//     whose charge hit 2+ players outside the pair, or took it 15y+ from the
//     strike point ("Charge Taken From the Wrong Side"). Targeted per attack.
//   ffxiv-lc-knockback: Major. Holder knocked off by their own sword/charge
//     with no stray hit in the prior 3s. Targeted per attack.
//   ffxiv-lc-hawk-blaster: Minor, Major if it killed. Not flagged within
//     2.5s after a stray hit. Exposure: everyone.
//   Not flagged: attacks whose holder was dead, the attack after one that
//   hit an extra when it hits the same players, J Kick. Fallout (after the
//   first death) is not independent.
// Cutoffs (Limit Cut wipes only, earliest wins): ffxiv-lc-dead-going-in
//   (dead at markers +1s), ffxiv-lc-death (first death), ffxiv-lc-called-wipe
//   (3+ no-killing-blow deaths in 10s, or any within 12s of the end, knock-
//   offs excluded), ffxiv-lc-collapse (4 dead, pull over within 30s). Of 28
//   wipes in report A/B: dead going in 11, both healers dead 10, collapse 6,
//   called wipe 1, unexplained 0.
// Key thresholds: sword axis clean within 19 degrees (p90, median 9, 152
//   swords), wrong-facing hits were 118 and 137 degrees off, flag at >60.
//   Charge holder clean 0.4-6.4y from the strike point (p90 5y, 449), flag
//   at 15y+. Knockback deaths 2.1-3.1s after the hit. Second numbered hit
//   inside the 17s Physical Vulnerability kills (16-42k).
// Assumptions: NAUR 1256 plan (north-west half starts 1256, south-east 3478).
//   Any death in Limit Cut makes later deaths fallout (user, VOD
//   2026-10-16).
// Sections (grep the heading): "VERIFIED AGAINST LOGS (2026-10-16)" (clock,
//   log ids, findings, cutoff counts), "RULES IMPLEMENTED" (rules, VOD
//   reviews, replay findings, open questions 1-3), "GUIDE-DERIVED MODEL
//   (2026-10-15)", "SOURCES CHECKED 2026-10-15", "CHRONOLOGY AND CLOCK
//   ANCHOR", "NAMING, GEOMETRY, AND OBSERVABILITY", "ALPHA SWORD / SUPER
//   BLASSTY CHARGE", "OPTICAL SIGHT / HAWK BLASTER", "NAUR / HARU GLORY 1256
//   PLAN", "STRATEGY VARIANCE / EXPECTED COSTS" (Arm's Length / Surecast
//   either way is not an error), "WHAT ENDS A PULL" (completion is all eight
//   hits then J Kick), "OPEN QUESTIONS FOR LOG VERIFICATION" (long, original
//   pre-log list).
// Open items: charge through 2+ players (who was wrong?); sword partner at
//   the cone apex named alone; #6 at the edge of #7's sword. Hawk Blaster
//   casts are missing from 7 pulls that reached the swords.
// -- END DIGEST --
//
// -- VERIFIED AGAINST LOGS (2026-10-16) --
// Report A = 1NG4Zah79yKYHCDv (73 pulls, captured --to-minutes 3; 27
// reached Limit Cut, 9 reached J Kick, 2 clean). Report B =
// HwjvVh3TNAZmMQyq (47 pulls, the 32 that reached phase 2 fetched with
// --min-phase 2; all 32 reached J Kick, 20 clean). Same static, NAUR plan
// (user), no VODs, no kill. Pulls are cited A<n> / B<n> = the app's Pull n
// with the whole report imported (B's numbering includes the 15 P1 wipes
// left off disk).
// Clock (from the first Hawk Blaster, every pull within ~0.2s): number
// head markers -2.0 (79..86 = 1..8, sent ~0.1s apart); blasts 0.0 / 2.2 /
// 4.4 / 6.6 / center 8.8 / 11.0 / 13.2 / 15.5 / 17.7 / center 19.9, damage
// ~0.6s after each cast; swords +7.4 / 12.1 / 16.7 / 21.3; charges +8.9 /
// 13.5 / 18.2 / 22.8; J Kick +26.0; FFLogs' phase 3 (BJ/CC) starts ~+29.
// The first blast lands 1:47-2:09 into the pull.
// Log IDs: Hawk Blaster 18480 (two helpers "Cruise Chaser"#1/#2 at arena
// center, one cast per outer circle; the center blast is one cast; P2's
// Optical Sight blasts are 18481). The casts are missing from 7 pulls that
// reached the swords (A40, A60, A63, A64, B2, B6, B20). Alpha Sword 18484
// (P3's is 18539), Super Blassty Charge 19279, J Kick 18516 (Brute
// Justice). Each numbered hit gives Magic Vulnerability Up 1001138 (10s)
// and Physical Vulnerability Up 1000695 (17s), applied ~0.3s before the
// damage event. No Damage Down (Shadowbringers): avoidables are Minor
// unless they kill.
// Findings:
// - Numbers: the head markers name all eight holders. A player dead at
//   the markers gets none (A35 had 4). The cast target is the holder when
//   the hit lands on one player (312 of 331); it is lost when two or more
//   are hit, and a dead holder's attack retargets onto someone near.
// - Geometry: the sword cast's x/y is Cruise Chaser's strike point (r ~13-
//   15y), and its logged facing is the cone's axis. Clean swords'
//   axis runs clockwise along the track: within 19 degrees (p90, median 9,
//   152 swords). The two swords that hit a partner from a wrong facing were
//   118 (A69 #3) and 137 (B5 #3) off. Sword extras inside a correctly aimed
//   cone were the partner at its apex (0.4-1.9y from the strike point:
//   A53, A57, B8, B11, B42 at #1/#5) or the previous pair's #6 standing
//   24-30y out at the cone's edge (44-51 degrees off axis) for #7's sword
//   (B8, B30, B38; died under the vulnerability). Owners stand 1.3-13.1y
//   from the strike point (median 2.7).
// - Charges hit their even holder from the strike point; clean ones run any
//   direction, so their aim can't be judged from geometry. Extras: the
//   waiting pair (B1 #8: #3 and #7 within 2y of the strike point) or
//   players near the line (B8 #8: 5.3y off it).
// - Deaths with no killing blow 2.1-3.1s after a sword/charge's damage (34,
//   both reports) are knockbacks off the arena; owners knocked off by their
//   own (mostly the 20y charge) in A36, A44, A48, A49, A50, A51, A53, A58,
//   A67. The next no-killing-blow deaths after a hit were 4.3s+ (resets).
// - Hawk Blaster: every hit killed or followed a stray (21-47k, 7-16k on
//   players already low); B11's #6 was knocked into one by #5's sword.
// - A second numbered hit inside the 17s Physical Vulnerability Up kills
//   (16-42k), so a stray hit usually kills its victim at their own number.
// - Dead going in: all 10 pulls with a player dead at the markers wiped in
//   Limit Cut (A35, A36, A44, A56, A57, A59, A64, A66, A67, A69 and B17,
//   where the holderless #8 charge hit five).
// - Any death in Limit Cut makes the rest fallout (user, VOD 2026-10-16:
//   "if anyone dies during Limit Cut, others who die are almost always the
//   fallout of that person dying"; B3, C1 the #1 holder backflipping into a
//   blast 0.2s before their own sword hit three, C3 a healer's blast
//   death). A dead player at the markers can land on the markers' instant
//   (C7's Throttle death).
// - Two or three Limit Cut deaths can carry into BJ/CC (B1, B4, B8), but
//   a player still dead at the first Nisi pass loses BJ/CC (bj-cc.ts). J Kick deaths (A47, A50, A52, A54, B17) are raw damage on a short-
//   handed party, mitigation territory.
// Cutoffs (28 Limit Cut wipes = pulls ending within 30s of J Kick or
// before it; every one has one): dead going in 11 (A35, A36, A44, A56, A57,
// A59, A64, A66, A67, A69, B17), both healers dead (ffxiv/common.ts) 10
// (A40, A45, A47, A48, A49, A51, A52, A53, A54, B5), collapse 6 (A50, A60,
// A61, A62, B6, B20), called wipe 1 (A63). Unexplained: none.
//
// -- RULES IMPLEMENTED --
// ffxiv-lc-stray (Minor; Major when it killed: the hit itself, a knock off
//   the edge, or a later sword/charge/blaster under its vulnerability): a
//   player hit by another number's sword or charge. The partner of the
//   active pair gets "trail / stay off the line" advice, everyone else
//   "keep to the outside".
// ffxiv-lc-aim (Minor/Major by the extras' deaths), on the holder: a sword
//   that hit someone else while pointing more than 60 degrees off the
//   clockwise track (its extras aren't flagged), or a charge that hit two
//   or more players outside the pair (its extras are flagged too: README
//   philosophy 3, the log can't say who moved). A charge whose holder stood
//   15y+ from Cruise Chaser's strike point (clean 0.4-6.4y, p90 5y, 449
//   charges) and hit anyone: "Charge Taken From the Wrong Side", the
//   holder's alone (user, E7 +1:57.9: #2 on the wrong side of the arena;
//   also A40 #2), its victims not flagged.
// ffxiv-lc-knockback (Major), on the holder: knocked off the arena by their
//   own sword/charge, no stray hit on them in the 3s before.
// ffxiv-lc-hawk-blaster (Minor; Major if it killed). Not flagged within
//   2.5s after a stray hit (the knockback carried them).
// Not flagged: attacks whose holder was dead (they retarget), the attack
//   right after one that hit an extra player when it hits the same players
//   (the pair was knocked apart: B5, A69), J Kick.
// Fallout: every attack and blast after the first death (from the
//   markers), and an attack landing after it that didn't cause it.
// Cutoffs, Limit Cut wipes only, the earliest: ffxiv-lc-dead-going-in (a
//   player dead at the markers, read 1s after them), ffxiv-lc-death (that
//   first death),
//   ffxiv-lc-called-wipe (3+ no-killing-blow
//   deaths in 10s or any within 12s of the end, knock-offs excluded),
//   ffxiv-lc-collapse (4 dead, pull over within 30s).
// Exposure: aim and knockback are targeted (each attack's holder, reported
//   per attack); stray and blaster are everyone.
// VOD review 2026-10-16 (user): report B pulls 3, 20 and report C =
//   LxAVFd29kwPm8HnB (now all 30 pulls on disk, full captures) pulls 1, 3,
//   7, rulings in expectations/rulings.json. Questions 2 and 3 below were asked (B3, B8)
//   and the VOD couldn't show either.
// VOD review 2026-10-17 (user): report E = AHw6VfLrZ97Gj1Dn (all 31 pulls
//   on disk) pull 7, rulings in expectations/rulings.json. NAUR's 1256
//   group starts on the north-west half, 3478 on the south-east (the user's
//   cheat sheet).
// VOD review 2026-10-17 (user): report F = Q9zqJb4VLmjhd1B6 pulls 2 (#2
//   no knockback resist; facing Cruise Chaser shortens the knockback a lot)
//   and 10 (#1 angled the sword wrong), rulings in expectations/rulings.json.
// Replay findings (2026-10-18, tea/replay.ts): a Hawk Blaster hit's source
//   position is its circle's centre, 15y out (A35 fight 36 2:20.7: (85.0,
//   100.0)); the casts carry none. Each set's start pair can differ (A35's
//   second set started W/E); the kill F4 ran clockwise from NE/SW in both.
// OPEN QUESTIONS:
// 1. A charge through two or more players names the even holder and the
//    players hit (A45 #2, A50 #8, B9 #2). Which was it?
// 2. A sword partner at the cone's apex is named alone (the odd holder's
//    facing was normal): too close behind, or did the odd player stop?
// 3. #6 caught at the edge of #7's sword (B8, B30, B38): should #6 have been
//    further out, or is #7's cone reaching them the odd player's aim?
//
// -- GUIDE-DERIVED MODEL (2026-10-15) --
// Comment-only research, no report/VOD verification or detector code.
// Covers LL's defeat through the J Kick leading into BJ/CC. P3 Wormhole
// reuses numbered attacks but has different charge ID, cadence and duties;
// it is modeled in alexander-prime.ts. A future log-verified section wins.
// Scope: level-80 Ultimate (5.11), item-level sync 475, eight players.
// Damage and kill speeds vary with job/gear patches. Head markers, arena
// patterns, and assignments are not FFLogs-verified by this research.
//
// -- SOURCES CHECKED 2026-10-15 --
// [NA] NAUR directory and the linked Elina/NA PF toolbox:
// https://naurffxiv.com/ultimate/tea
// https://ff14.toolboxgaming.space/?id=803293127441961&preview=1
// [WD] Browser, NAUR/Elinabin Limit Cut tab:
// https://wtfdig.info/ultimates/tea#naur
// [IV] Lyra, Haru Glory / 1256 explanation and facing/knockbacks:
// https://www.icy-veins.com/ffxiv/the-epic-of-alexander-ultimate-guides-limit-cut
// [US] Regional 1256 W-to-NE convention, compared with NAUR:
// https://ultistrats.com/guides/tea/
// [BM] Primary ability/geometry definitions, master branch:
// https://github.com/awgil/ffxiv_bossmod/tree/master/BossMod.Ultimate/Shadowbringers/Ultimate/TEA
// Read LimitCut.cs, P2Intermission.cs, TEAEnums.cs, TEAConfig.cs,
// TEAStates.cs. No implementation copied; IDs are game-data candidates.
// [CB] Primary event timeline, main branch:
// https://github.com/quisquous/cactbot/blob/main/ui/raidboss/data/05-shb/ultimate/the_epic_of_alexander.txt
// Same path: the_epic_of_alexander.ts (numbered head markers).
//
// -- CHRONOLOGY AND CLOCK ANCHOR --
// LL's defeat triggers an untargetable intermission; it is not a boss HP
// check of its own. All eight players receive unique numbers 1 through 8.
// There are four odd/even attack pairs, while two rotating ground-blast
// sequences constrain the safe path. Finish all eight hits, gather for
// J Kick, then both BJ and CC become targetable about 3s after J Kick.
// [CB] has a synthetic timeline jump to 200 for the first Hawk Blaster.
// Below t=0 is that first actual blast, NOT pull time or LL kill time:
//    0.0 / 2.2 / 4.4 / 6.6: opposing outer blasts, then center +8.8.
//   +7.4 #1 sword; +8.9 #2 charge.
//   +11.0 / 13.2 / 15.5 / 17.7: outer blasts, center +19.9.
//   +12.1 #3 sword; +13.6 #4 charge.
//   +16.8 #5 sword; +18.3 #6 charge.
//   +21.4 #7 sword; +22.9 #8 charge; +26.1 J Kick.
// Sword -> paired charge ~1.5s; charge -> next sword ~3.2s. Markers
// precede the first sword by roughly 9.5s [BM]; their individual delivery
// can span a few hundred milliseconds. Exact delays await a report.
// No separate long enrage: the scripted eight-hit sequence and transition
// are the deadlines. A late move can fail even after its own number ended.
//
// -- NAMING, GEOMETRY, AND OBSERVABILITY --
// Candidate resolving damage: Hawk Blaster 18480 (helper ground attack);
// Alpha Sword 18484 (CC cone); Super Blassty Charge 19279 (CC line);
// J Kick 18516 (BJ raidwide). CC actor 0x2C4E, BJ 0x2C4C.
// [BM] Alpha Sword ~30y / 90-degree cone, 5y knockback. Charge is ~55y
// long, 10y wide, with 20y knockback. These include source hitbox in some
// definitions; use them as candidate geometry, not measured tolerances.
// Head markers raw 79..86 represent numbers 1..8, not player statuses.
// Marker colors are blue odd / red even. Their visibility in ACT/BossMod
// does not establish that the app's FFLogs payload contains head markers.
// Short vulnerability follows numbered hits; name/ID/duration unverified.
// Minor/Major/Raid follow MODEL-RESEARCH-GUIDE and README: surviving
// avoidable damage without Damage Down can be Minor; a named lethal
// mistake is Major; unrecoverable sequence is Raid. Damage Down, if
// confirmed, is Major. Death fallout does not create additional blame.
//
// -- ALPHA SWORD / SUPER BLASSTY CHARGE --
// What happens: CC teleports behind each odd-numbered player, using that
// player's facing, and cleaves. It then charges the paired even number.
// Pair sequence is 1->2, 3->4, 5->6, 7->8. The cone's source position
// and facing are set by the odd baiter; the line's far endpoint is the
// even baiter. An even player can aim the charge through bystanders.
// Correct play: isolate the current pair on the route's inside track;
// lower number ahead, preserve facing/route and distance. Everyone else
// stays outside their cone/line. Survive exactly one's own numbered hit.
// [IV] warns that not facing CC when struck produces excessive knockback.
// NAUR's moving route naturally establishes facing. Knockback prevention
// is allowed; it does not eliminate cone/line damage or vulnerability.
// Failure: odd bait aimed at party -> LOG SIGNAL: 18484 hits extra living
// players; FAULT: odd baiter if wrong facing/location is established,
// otherwise misplaced bystander or unresolved; CONSEQUENCE: Major if
// lethal, Raid when the remaining sequence cannot be completed.
// Failure: even bait crosses others -> LOG SIGNAL: 19279 hits bystanders
// between CC and number's location; FAULT: even baiter for an invalid
// endpoint, bystander for entering a correct lane; CONSEQUENCE: as above.
// Failure: more than one numbered attack -> LOG SIGNAL: repeated hits
// during vulnerability / lethal repeat; FAULT: position/aim root cause,
// never automatically every repeated-hit victim; CONSEQUENCE: Major.
// Failure: knockback into lethal edge -> LOG SIGNAL: hit followed by
// displaced position/death, sometimes no killing ability; FAULT: baiter
// or knocked player only when facing/assignment evidence settles it;
// CONSEQUENCE: Major; unresolved post-death retargets remain fallout.
// Removal: numbered markers are consumed by the sequence; vulnerability
// times out. No dispel or sourced explosion on aura removal. A dead
// numbered target may make later targeting unreliable; semantics open.
// Not errors: own sword/charge, intentional prevention, planned knockback
// within arena. A successful hit is not an avoidable-ability failure.
//
// -- OPTICAL SIGHT / HAWK BLASTER --
// What happens: four pairs of opposite outer circles progress clockwise
// by 45 degrees, then one center circle; repeat once. Ten time steps,
// eighteen individual circles: 8 + 1 + 8 + 1. Outer circle centers are
// ~14y from arena center, each radius 10y [BM]. Initial orientation can
// be cardinal or intercardinal. The rotating safe area is arena-relative.
// Correct play: follow already-resolved outer circles, do not cut through
// center before the second center blast. Preserve pair spacing while
// crossing each safe slice. No player aims these fixed ground circles.
// Failure: ground hit -> LOG SIGNAL: damage 18480 at the victim's
// position; FAULT: entrant unless a prior bad sword/charge displaced them;
// CONSEQUENCE: Minor if survivable/no Damage Down, Major if lethal or
// confirmed Damage Down. A death chain may establish Raid.
// Removal: ground circles resolve on the clock; no aura cleanse. A
// player's death does not remove the upcoming fixed blasters.
// Not errors: passing through a resolved blast footprint; clockwise
// movement at either radius while not currently assigned the inner track.
//
// -- NAUR / HARU GLORY 1256 PLAN --
// Two groups: 1/2/5/6 and 3/4/7/8. Choose the first explosion in the
// inclusive W -> NW -> N -> NE semicircle for group 1256; other group
// starts at its opposite. If the initial pair is E/W, 1256 starts W.
// The numeric groups are assignments, not generic tank/healer/DPS slots.
// At first explosions 1/2/3/4 are inner; 5/6/7/8 outer. Lower member of
// each pair is ahead along movement. Follow the clockwise safe route.
// 1 takes sword near outer blast 4; 2 takes dash near first center blast.
// After 1/2 finish, they exchange tracks with 5/6. 3/4 must wait for their
// own pair instead of copying the first group's inward move too early.
// After 3/4 finish, exchange with 7/8. All inactive players keep moving;
// 5/6 and then 7/8 complete. Following the last center blast, return to
// middle without crossing the final #7 cone / #8 line.
// [WD] gives these swaps explicitly. There is no fixed compass spot for
// a number once the blasts start: position advances around the arena.
//
// -- STRATEGY VARIANCE / EXPECTED COSTS --
// 1256 is shared by NAUR, LPDU-linked resources and OCE; the starting
// semicircle convention is a plan, not part of the underlying mechanic.
// Alternative common execution uses the same dance with mirrored start
// reference, different pair spread/stack distances or prevention on all
// hits. [IV] recognizes other routes without supplying enough detail to
// reconstruct their exact assignments; no invented route is prescribed.
// [BM] exposes configurable common-side versus opposite-group hints;
// a hint option alone is not evidence that a full alternate strat is safe.
// Some groups take normal knockback; others always use Arm's Length or
// Surecast as Wormhole practice. Neither choice alone is an error.
// J Kick is unavoidable; grouping for shields/heals before it is normal.
// A death to correct J Kick mitigation is not a mechanic-position flag.
//
// -- WHAT ENDS A PULL --
// Multiple deaths usually destroy the remaining unique-number sequence.
// One death can also cascade through a later missing target, but whether
// it is immediately unrecoverable needs evidence of the remaining hits.
// The first bad bait/ground hit is the root cause; later retargeted attacks
// are not independent mistakes. A reset at the edge is possible.
// Completion is all eight numbered attacks followed by J Kick, not merely
// survival of the last center blast or CC temporarily disappearing.
//
// -- OPEN QUESTIONS FOR LOG VERIFICATION --
// 1. Are numbered head markers, facing, tether-like assignments and CC
//    teleport positions actually retained in this app's FFLogs streams?
// 2. Map cone/line vulnerability, exact duration, knockback distances,
//    hitbox-adjusted widths and any Damage Down or lethal-edge ability.
// 3. How does CC resolve a dead/missing numbered target, including a death
//    before the markers? Can a living party recover any such sequence?
// 4. Establish LL-kill -> marker/blaster -> J Kick anchors and count all
//    eighteen circles separately from ten time steps in a clean pull.
// 5. Confirm the actual group's route, track spacing, prevention usage,
//    facing behavior and whether historical/future jobs alter animation.

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import type { ReportedOccurrence } from "@/lib/mechanics/occurrences";
import type { HeadMarker } from "@/lib/mechanics/ffxiv/fru/usurper-of-frost";
import { ARENA_CENTER, compassBearingOf, facingToCompassBearing } from "@/lib/mechanics/geometry";
import { kFmt, joinNames, playerError, raidMarker } from "@/lib/mechanics/wow/common";
import {
  DEATH_EVENT_LAG_MS, type Life, bodyHit, buildLife, castsOf, uniq, namesOf, realAmount, resetCluster,
} from "@/lib/mechanics/ffxiv/fru/common";

export const LC_HAWK_BLASTER_RULE_ID = "ffxiv-lc-hawk-blaster";
export const LC_STRAY_RULE_ID        = "ffxiv-lc-stray";
export const LC_AIM_RULE_ID          = "ffxiv-lc-aim";
export const LC_KNOCKBACK_RULE_ID    = "ffxiv-lc-knockback";
export const LC_DEAD_GOING_IN_RULE_ID = "ffxiv-lc-dead-going-in";
export const LC_DEATH_RULE_ID        = "ffxiv-lc-death";
export const LC_CALLED_WIPE_RULE_ID  = "ffxiv-lc-called-wipe";
export const LC_COLLAPSE_RULE_ID     = "ffxiv-lc-collapse";

const HAWK_BLASTER = 18480;     // the ground circles (P2's Optical Sight blasts are 18481)
const ALPHA_SWORD  = 18484;     // odd numbers' cone (P3's is 18539)
const CHARGE       = 19279;     // Super Blassty Charge, even numbers' line
const J_KICK       = 18516;
const TEMPORAL_STASIS = 18522;  // phase 3's first cast
const FIRST_SWORD_MS = 7_400;   // first blast -> first sword, every pull
const FIRST_MARKER = 79;        // head markers 79..86 = numbers 1..8
const LAST_MARKER  = 86;

// Clean swords point within 19 degrees of the clockwise track (p90, median
// 9, 152 swords); the two misaimed ones that hit a partner were 118 (A69)
// and 137 (B5) off. Swords whose extra victims stood in a normal cone
// were at most 38 off (A35, players already dead).
const AIM_MAX_DEG = 60;
// No-killing-blow deaths 2.1-3.1s after a sword/charge hit's damage event
// (34 of them, both reports): knocked off the arena edge. The next ones
// were 4.3s+ (a called wipe).
const KNOCKOFF_MIN_MS = 1_800;
const KNOCKOFF_MAX_MS = 3_600;
// Physical Vulnerability Up from each numbered hit lasts 17s: any second
// numbered hit inside it kills.
const VULN_MS = 17_000;
// The even holder stands 0.4-6.4y from Cruise Chaser's strike point in
// clean charges (p90 5y, 449 single-hit charges); E7's #2 on the wrong side
// of the arena was 27y away.
const WRONG_SIDE_YALMS = 15;
// A Hawk Blaster hit this soon after a stray sword/charge is the knockback
// carrying the player into it (B11 +18.3).
const DISPLACED_MS = 2_500;
const COLLAPSE_DEAD_COUNT = 4;
const COLLAPSE_END_MS     = 30_000;
const CALLED_WIPE_COUNT   = 3;
const CALLED_WIPE_WINDOW  = 10_000;
const CALLED_WIPE_END_MS  = 12_000;
// A pull that ends this long after J Kick is the Brute Justice / Cruise
// Chaser phase's wipe, not this intermission's.
const LC_WIPE_AFTER_KICK_MS = 30_000;

type Attack = {
  n: number;                    // 1..8
  cast: EnemyEvent;
  sword: boolean;
  owner?: PlayerInfo;           // the number's holder, alive at the cast
  hits: { p: PlayerInfo; e: PlayerEvent }[];
  extras: PlayerInfo[];
  retarget: boolean;            // the number's holder was dead or missing
};

const ordinal = (a: Attack) => `#${a.n}'s ${a.sword ? "Alpha Sword" : "Super Blassty Charge"}`;
const yalms = (dx: number, dy: number) => Math.hypot(dx, dy) / 100;
const sdiff = (a: number, b: number) => ((a - b) % 360 + 540) % 360 - 180;

/**
 * How far a sword's cone pointed off the clockwise track. In every clean
 * sword the owner stands along Cruise Chaser's facing, which runs
 * clockwise along the route. (Written as "facing + 180" until
 * geometry.ts's facingToCompassBearing was corrected on 2026-10-17; it
 * had returned the direction behind.)
 */
function swordDeviation(c: EnemyEvent): number | undefined {
  if (c.x === undefined || c.y === undefined || c.facing === undefined) return undefined;
  const axis = facingToCompassBearing(c.facing);
  const tangent = (compassBearingOf(c.x, c.y) + 90) % 360;
  return sdiff(axis, tangent);
}

/** The eight numbered attacks, each with its marker owner and its hits. */
function buildAttacks(players: PlayerInfo[], life: Life, casts: EnemyEvent[], numbers: Map<number, PlayerInfo>, start: number, end: number): Attack[] {
  return castsOf(casts, [ALPHA_SWORD, CHARGE], end).filter((c) => c.timestamp >= start).map((cast, i) => {
    const n = i + 1;
    const holder = numbers.size ? numbers.get(n) : players.find((p) => p.name === cast.target);
    const owner = holder && life.alive(holder, cast.timestamp - 300) ? holder : undefined;
    const hits = players.flatMap((p) => p.damageTaken
      .filter((e) => e.abilityId === cast.abilityId && e.timestamp >= cast.timestamp - 100 && e.timestamp - cast.timestamp < 1200 && !bodyHit(e) && life.hitAlive(p, e.timestamp))
      .map((e) => ({ p, e })));
    const hitPlayers = uniq(hits.map((h) => h.p));
    return { n, cast, sword: cast.abilityId === ALPHA_SWORD, owner, hits, extras: hitPlayers.filter((p) => p !== owner), retarget: !owner };
  });
}

/** A death with no killing blow this soon after a hit is a knock off the edge. */
const knockedOff = (d: DeathEvent | undefined, hitT: number) =>
  !!d && !d.killingAbilityGameId && d.timestamp - hitT >= KNOCKOFF_MIN_MS && d.timestamp - hitT <= KNOCKOFF_MAX_MS;

/**
 * Who stood in another number's sword or charge, who aimed one into the
 * party, and who was knocked off the edge by their own. Attacks whose
 * number was dead retarget at random (fallout, unflagged), and so does the
 * next attack when the one before it already hit an extra player: the
 * pair was knocked apart (B5 #3 -> #4, A69 #3 -> #4).
 */
function detectNumberedAttacks(attacks: Attack[], deaths: DeathEvent[], kickT: number, lost: { t: number; player: string } | undefined, displaced: Map<PlayerInfo, number[]>, occurrences?: ReportedOccurrence[]) {
  const errors: PullError[] = [];
  const nextDeath = (p: PlayerInfo, t: number) => deaths
    .filter((d) => d.player === p.name && d.timestamp > t && d.timestamp - DEATH_EVENT_LAG_MS <= kickT)
    .sort((a, b) => a.timestamp - b.timestamp)[0];
  // An extra's death that this hit caused: the hit itself, a knock off the
  // edge, or a later sword/charge under its vulnerability.
  const killedBy = (p: PlayerInfo, t: number) => {
    const d = nextDeath(p, t);
    if (!d) return undefined;
    if (knockedOff(d, t) || d.timestamp - t <= DEATH_EVENT_LAG_MS + 1000) return d;
    if ((d.killingAbilityGameId === ALPHA_SWORD || d.killingAbilityGameId === CHARGE) && d.timestamp - t <= VULN_MS + DEATH_EVENT_LAG_MS) return d;
    if (d.killingAbilityGameId === HAWK_BLASTER && d.timestamp - t <= DISPLACED_MS + DEATH_EVENT_LAG_MS + 500) return d;
    return undefined;
  };
  attacks.forEach((a, i) => {
    const t = a.cast.timestamp;
    const label = ordinal(a);
    for (const h of a.hits) if (h.p !== a.owner || a.retarget) displaced.set(h.p, [...(displaced.get(h.p) ?? []), h.e.timestamp]);
    if (a.owner) {
      occurrences?.push({ mechanicKey: LC_AIM_RULE_ID, timestamp: t, players: [a.owner.name] });
      occurrences?.push({ mechanicKey: LC_KNOCKBACK_RULE_ID, timestamp: t, players: [a.owner.name] });
    }
    // After the first death (lost.t), or landing after it without having
    // caused it (C1: the #1 holder died in a blast 0.2s before their own
    // sword hit three others).
    const firstHit = Math.min(...a.hits.map((h) => h.e.timestamp));
    const causedIt = !!lost && a.hits.some((h) => h.p.name === lost.player);
    if (a.retarget || (lost && (t > lost.t + 500 || (firstHit > lost.t && !causedIt)))) return;
    const prev = attacks[i - 1];
    const fallout = !!prev && t - prev.cast.timestamp < 2500 && a.hits.some((h) => prev.extras.includes(h.p) || (prev.retarget && prev.hits.some((x) => x.p === h.p)));
    const owner = a.owner!;

    // Own knockback off the edge (no extra hit on them just before).
    const ownHit = a.hits.find((h) => h.p === owner);
    const wasExtra = (displaced.get(owner) ?? []).some((x) => x < t && t - x <= 3000);
    if (ownHit && !a.extras.length && !wasExtra && !fallout) {
      const d = nextDeath(owner, ownHit.e.timestamp);
      if (knockedOff(d, ownHit.e.timestamp)) errors.push(playerError(owner, {
        ruleId: LC_KNOCKBACK_RULE_ID, severity: "Major", name: "Knocked Off by Own Number",
        description: `Their own ${a.sword ? "Alpha Sword" : "Super Blassty Charge"} (#${a.n}) knocked them off the arena; they died ${((d!.timestamp - ownHit.e.timestamp) / 1000).toFixed(1)}s later. ${a.sword ? "The sword knocks back along your facing" : "The charge knocks you 20y along its line"}: use knockback immunity (Arm's Length / Surecast), or face Cruise Chaser, which shortens the knockback a lot, and keep to the route's inside track.`,
        timestamp: ownHit.e.timestamp, abilityId: a.cast.abilityId, abilityName: a.cast.abilityName,
      }));
    }
    if (!a.extras.length || fallout) return;

    const ownerHit = ownHit?.e;
    const dev = a.sword ? swordDeviation(a.cast) : undefined;
    const killed = a.extras.filter((p) => killedBy(p, t));
    const deadText = killed.length ? ` ${namesOf(killed)} died.` : "";
    const where = (p: PlayerInfo) => {
      const e = a.hits.find((h) => h.p === p)?.e;
      if (!e || e.x === undefined || e.y === undefined || a.cast.x === undefined || a.cast.y === undefined) return "";
      return ` ~${yalms(e.x - a.cast.x, e.y - a.cast.y).toFixed(1)}y from where Cruise Chaser struck`;
    };

    if (a.sword && dev !== undefined && Math.abs(dev) > AIM_MAX_DEG) {
      errors.push(playerError(owner, {
        ruleId: LC_AIM_RULE_ID, severity: killed.length ? "Major" : "Minor", name: "Alpha Sword Aimed Into the Party",
        description: `Their Alpha Sword (#${a.n}) pointed ${Math.abs(dev).toFixed(0)} degrees off the route (clean swords stay within ~20) and hit ${namesOf(a.extras)}.${deadText} Cruise Chaser strikes from behind you along your facing: keep facing clockwise along the route so the cone runs ahead of you, away from your partner.`,
        timestamp: t, abilityId: ALPHA_SWORD, abilityName: "Alpha Sword",
      }));
      return;
    }
    // A charge whose holder stood across the arena from Cruise Chaser's
    // strike point: the holder was on the wrong side (user, 2026-10-17, E7
    // +1:57.9: "#2 was on the wrong side of the arena"), and whoever the
    // line crossed is theirs, not a stray.
    const ownerDist = ownerHit && ownerHit.x !== undefined && ownerHit.y !== undefined && a.cast.x !== undefined && a.cast.y !== undefined
      ? yalms(ownerHit.x - a.cast.x, ownerHit.y - a.cast.y) : undefined;
    if (!a.sword && ownerDist !== undefined && ownerDist >= WRONG_SIDE_YALMS) {
      const ownDeath = nextDeath(owner, ownerHit!.timestamp);
      const ownKnock = knockedOff(ownDeath, ownerHit!.timestamp);
      errors.push(playerError(owner, {
        ruleId: LC_AIM_RULE_ID, severity: killed.length || ownKnock ? "Major" : "Minor", name: "Charge Taken From the Wrong Side",
        description: `As #${a.n} they stood ~${ownerDist.toFixed(0)}y from where Cruise Chaser struck, across the arena from their partner (clean charges: within ~6y), so the charge ran through ${namesOf(a.extras)}.${deadText}${ownKnock ? " Its knockback also carried them off the arena." : ""} Stay on your group's half beside #${a.n - 1}, ahead of them on the route.`,
        timestamp: t, abilityId: CHARGE, abilityName: "Super Blassty Charge",
      }));
      return;
    }
    const partnerN = a.sword ? a.n + 1 : a.n - 1;
    const bystanders = a.extras.filter((p) => ![...attacks].some((x) => x.n === partnerN && x.owner === p));
    for (const p of a.extras) {
      const partner = !bystanders.includes(p);
      const died = killed.includes(p);
      const hitT = a.hits.find((h) => h.p === p)!.e.timestamp;
      const d = nextDeath(p, hitT);
      const how = !died ? ", taking its 17s Vulnerability Up: a second numbered hit kills"
        : knockedOff(d, hitT) ? ", was knocked off the arena and died"
        : d!.timestamp - hitT <= DEATH_EVENT_LAG_MS + 1000 ? " and died to it"
        : " and died to a later hit under the Vulnerability Up it left";
      errors.push(playerError(p, {
        ruleId: LC_STRAY_RULE_ID, severity: died ? "Major" : "Minor", name: `Hit by ${a.sword ? "Another's Alpha Sword" : "Another's Charge"}`,
        description: `Stood in ${label}${where(p)}${ownerHit ? ` (${owner.name} took it as planned)` : ""}${how}. ${partner
          ? (a.sword ? `As #${partnerN}, trail your partner by a few yalms: Cruise Chaser appears right behind #${a.n} and the cone covers its apex.` : `As #${partnerN}, stay ahead of your partner and off the line from Cruise Chaser to #${a.n}.`)
          : `Only the active pair stands on the inside track; everyone else keeps moving on the outside, clear of the cone and the charge line.`}`,
        timestamp: t, abilityId: a.cast.abilityId, abilityName: a.cast.abilityName,
      }));
    }
    if (!a.sword && bystanders.length >= 2) {
      errors.push(playerError(owner, {
        ruleId: LC_AIM_RULE_ID, severity: killed.length ? "Major" : "Minor", name: "Charge Aimed Through the Party",
        description: `Their Super Blassty Charge (#${a.n}) ran through ${namesOf(bystanders)} on its way to them.${deadText} The charge flies from Cruise Chaser to you: take it where the line stays on the inside track, clear of the waiting players.`,
        timestamp: t, abilityId: CHARGE, abilityName: "Super Blassty Charge",
      }));
    }
  });
  return errors;
}

/**
 * Hawk Blaster: fixed ground circles, telegraphed. Every hit in both
 * reports killed (21-47k). A hit within 2.5s of a stray sword/charge is
 * that hit's knockback (fallout).
 */
function detectHawkBlaster(players: PlayerInfo[], life: Life, start: number, end: number, displaced: Map<PlayerInfo, number[]>): PullError[] {
  const errors: PullError[] = [];
  for (const p of players) {
    for (const e of p.damageTaken.filter((x) => x.abilityId === HAWK_BLASTER && x.timestamp >= start && x.timestamp <= end && !bodyHit(x) && life.hitAlive(p, x.timestamp))) {
      if ((displaced.get(p) ?? []).some((t) => t <= e.timestamp && e.timestamp - t <= DISPLACED_MS)) continue;
      const died = life.diedFrom(p, e.timestamp);
      errors.push(playerError(p, {
        ruleId: LC_HAWK_BLASTER_RULE_ID, severity: died ? "Major" : "Minor", name: "Hit by Hawk Blaster",
        description: `Hit by a Hawk Blaster circle (${kFmt(realAmount(e))})${died ? " and died" : ""}. The blasts walk clockwise in opposite pairs, then the center: follow behind the ones that already went off and stay out of the center until the second center blast.`,
        timestamp: e.timestamp, abilityId: HAWK_BLASTER, abilityName: "Hawk Blaster",
      }));
    }
  }
  return errors;
}

/**
 * The Epic of Alexander, Intermission: Limit Cut. Self-gates on Hawk
 * Blaster 18480, which only this intermission casts, and covers from the
 * number markers (~2s before the first blast) to J Kick. Generic cutoffs
 * run only when the pull ends within 30s of J Kick (or before it).
 */
export function detectTeaLimitCutErrors(
  players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], headMarkers: HeadMarker[] = [], occurrences?: ReportedOccurrence[],
): PullError[] {
  // Hawk Blaster's casts are missing from 7 pulls that reached the swords
  // (A63, B2, ...); the first sword comes 7.4s after the first blast.
  const blasts = castsOf(enemyCasts, HAWK_BLASTER, Infinity);
  // Phase 3's Wormhole reuses this sword: on a capture starting after
  // Limit Cut it would read as this intermission (alexander-prime.ts).
  const stasis = enemyCasts.find((c) => c.abilityId === TEMPORAL_STASIS);
  const swords = castsOf(enemyCasts, ALPHA_SWORD, stasis ? stasis.timestamp : Infinity);
  if (!blasts.length && !swords.length) return [];
  const firstBlast = Math.min(blasts[0]?.timestamp ?? Infinity, swords.length ? swords[0].timestamp - FIRST_SWORD_MS : Infinity);
  const start = firstBlast - 5_000;
  const kick = enemyCasts.find((c) => c.abilityId === J_KICK && c.timestamp > firstBlast);
  const lastEvent = Math.max(0, ...players.flatMap((p) => [...p.damageTaken, ...p.casts].map((e) => e.timestamp)), ...deathEvents.map((d) => d.timestamp));
  const end = Math.min(kick ? kick.timestamp : firstBlast + 30_000, lastEvent);
  const life = buildLife(players, deathEvents);

  const marks = headMarkers.filter((m) => m.markerId >= FIRST_MARKER && m.markerId <= LAST_MARKER && m.timestamp >= start && m.timestamp <= firstBlast + 1000);
  const numbers = new Map<number, PlayerInfo>();
  for (const m of marks) {
    const p = players.find((x) => x.name === m.player);
    if (p) numbers.set(m.markerId - FIRST_MARKER + 1, p);
  }
  const attacks = buildAttacks(players, life, enemyCasts, numbers, start, end);
  const displaced = new Map<PlayerInfo, number[]>();
  const markT = marks.length ? Math.min(...marks.map((m) => m.timestamp)) : firstBlast - 2000;
  // The first death in Limit Cut: everything after it is its fallout (user,
  // 2026-10-16: "if anyone dies during Limit Cut, others who die are almost
  // always the fallout"; C1 the #1 holder died in a blast and their sword
  // hit three, C3 a healer's blast death, B3 #3's sword knocking #8 off).
  // The killing hit itself lands up to ~0.5s past the death time.
  const firstDeath = deathEvents.filter((d) => d.timestamp - DEATH_EVENT_LAG_MS >= markT && d.timestamp - DEATH_EVENT_LAG_MS <= end)
    .sort((a, b) => a.timestamp - b.timestamp)[0];
  const lost = firstDeath ? { t: firstDeath.timestamp - DEATH_EVENT_LAG_MS, player: firstDeath.player } : undefined;
  const numbered = detectNumberedAttacks(attacks, deathEvents, end, lost, displaced, occurrences);
  const errors: PullError[] = [...numbered, ...detectHawkBlaster(players, life, start, Math.min(end, lost ? lost.t + 500 : Infinity), displaced)];

  // Cutoffs, for wipes in this intermission only.
  const lcWipe = !kick || lastEvent - kick.timestamp <= LC_WIPE_AFTER_KICK_MS;
  if (!lcWipe) return errors.sort((a, b) => a.timestamp - b.timestamp);
  const generic: PullError[] = [];
  // +1s: a death can land on the markers' own instant (C7's Throttle).
  const unmarked = marks.length ? players.filter((p) => ![...numbers.values()].includes(p) && !life.alive(p, markT + 1000)) : [];
  if (unmarked.length) {
    generic.push(raidMarker(LC_DEAD_GOING_IN_RULE_ID, "Player Dead Going Into Limit Cut",
      `${namesOf(unmarked)} ${unmarked.length === 1 ? "was" : "were"} dead when the Limit Cut numbers went out, so ${unmarked.length === 1 ? "a number has" : "numbers have"} no holder: Cruise Chaser's sword or charge for it lands on whoever is nearest. Unresolvable from here; treated as the cutoff point.`,
      markT, 0, "Limit Cut"));
  }
  if (firstDeath) {
    const fp = players.find((p) => p.name === firstDeath.player);
    const killer = fp?.damageTaken.filter((e) => e.abilityId === firstDeath.killingAbilityGameId && e.timestamp <= firstDeath.timestamp).pop()?.abilityName;
    // A Phase 1 Throttle can run out here (D14): it ends as they die.
    const throttled = fp?.debuffs.some((e) => e.abilityId === 1000700 && e.debuffStatus === "removed" && Math.abs(e.timestamp - firstDeath.timestamp) <= 3000);
    generic.push(raidMarker(LC_DEATH_RULE_ID, "Death in Limit Cut",
      `${firstDeath.player} died (${firstDeath.killingAbilityGameId ? firstDeath.cause || killer || "an attack" : throttled ? "Throttle not cleansed" : "no killing blow"}) during Limit Cut: with a number down the rest of the sequence lands on the wrong players, so later hits are its fallout. Treated as the cutoff point.`,
      firstDeath.timestamp - DEATH_EVENT_LAG_MS, firstDeath.killingAbilityGameId, firstDeath.cause || "Death"));
  }
  const knockoffs = new Set(deathEvents.filter((d) => attacks.some((a) => a.hits.some((h) => h.p.name === d.player && knockedOff(d, h.e.timestamp)))));
  const silent = deathEvents.filter((d) => !d.killingAbilityGameId && !knockoffs.has(d) && d.timestamp - DEATH_EVENT_LAG_MS >= start);
  const called = new Set<DeathEvent>();
  for (const d of silent) {
    if (lastEvent - d.timestamp <= CALLED_WIPE_END_MS) called.add(d);
    const near = resetCluster(silent.filter((x) => Math.abs(x.timestamp - d.timestamp) <= CALLED_WIPE_WINDOW), deathEvents);
    if (near.length >= CALLED_WIPE_COUNT) near.forEach((x) => called.add(x));
  }
  const calledList = resetCluster([...called], deathEvents).sort((a, b) => a.timestamp - b.timestamp);
  if (calledList.length >= CALLED_WIPE_COUNT || (calledList.length && lastEvent - calledList[0].timestamp <= CALLED_WIPE_END_MS)) {
    generic.push(raidMarker(LC_CALLED_WIPE_RULE_ID, "Wipe Called",
      `${calledList.length} player${calledList.length > 1 ? "s" : ""} died with no killing blow (${joinNames(uniq(calledList.map((d) => d.player)))}) near the end: the wipe was called.`,
      calledList[0].timestamp - DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  const outAt = (t: number) => players.filter((p) => !life.alive(p, t));
  const collapseT = life.outIntervals.map((w) => w.start).filter((t) => t >= start).sort((a, b) => a - b)
    .find((t) => outAt(t).length >= COLLAPSE_DEAD_COUNT && lastEvent - t <= COLLAPSE_END_MS);
  if (collapseT !== undefined) {
    const who = outAt(collapseT).map((p) => p.name);
    generic.push(raidMarker(LC_COLLAPSE_RULE_ID, "Party Collapse",
      `${who.length} players were dead at once (${joinNames(who)}). Treated as the cutoff point.`,
      collapseT + DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  const marker = generic.sort((a, b) => a.timestamp - b.timestamp)[0];
  if (marker) errors.push(marker);
  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
