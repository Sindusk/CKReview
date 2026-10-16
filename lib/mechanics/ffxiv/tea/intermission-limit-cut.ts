// The Epic of Alexander (Ultimate) -- Intermission: Limit Cut.
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
