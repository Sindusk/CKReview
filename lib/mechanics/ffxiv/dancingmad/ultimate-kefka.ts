// lib/mechanics/ffxiv/dancingmad/ultimate-kefka.ts
//
// Phase 5 (Ultimate Kefka) per-pull rules for Dancing Mad. Entry point:
// detectUltimateKefkaErrors. Self-gates on Phase 5 IDs (none of them occur
// in any earlier phase), so it is safe to run on every pull.
//
// -- VERIFIED AGAINST LOGS (2026-09-27) --
// 29 pulls reach Phase 5, no kills. Pulls are cited as <code prefix>#<pull>
// with an offset from Ultima Repeater #1's begincast ("P5 +0"; the
// completed cast the module anchors on is +4.0):
//   one static: 1Vxz(1VxzYpGFfjMn8Ktv) 2aVk(2aVkjzJnNAgCw1FL)
//     n3Td(n3Tdc7X21yCxJfQz) bpAx(bpAxYMJah7qgtyfV) rWVf(rWVfdZ8QaPmHLvnK)
//     PQVa(PQVacXf31AjNmRkT) q4K9(q4K9wGfdTg2D3pZy) NW9t(NW9tK3kBhmZTqLfQ)
//     KZXy(KZXy9NYxMVc3mFnp) 3kzF(3kzFAY8wPrGtJLC4) ZADQ(ZADQVgGzTm8HNc2W)
//   another static: dQ8w(dQ8wmb1VhKt6yBXk), pulls 2/9/11.
// Seven pulls reached the Forsaken Null enrage (best: boss at 1.55%).
// The eleven one-static reports were fetched with --min-minutes 15
// --from-minutes 14, so their events before 14:00 are absent (deaths and
// combatantInfo are whole); validate.js runs only this module on them.
//
// Cutoff per pull (first Raid error): collapse 17 (1Vxz#5/7, rWVf#16,
// PQVa#11/15, q4K9#3/6/9, NW9t#7, KZXy#6/7/10, ZADQ#5/7, dQ8w#2/9/11),
// early Flare Diffusion 5 (n3Td#17, bpAx#5, NW9t#12, KZXy#11, 3kzF#18),
// Forsaken Null 5 (NW9t#4, 3kzF#2, ZADQ#1/3/11;
// KZXy#7 and dQ8w#9 had collapsed first), Flood group q4K9#7, Quake group
// 2aVk#4. No pull ended without one.
//
// Clock (identical in every pull, +/-0.2s): Repeater 0 (hits +5.0..+7.1),
// Fell Forces +10/+13/+16, Flood hits +22.5..+26.3, Orchestra +34.7 (Flare/
// Holy +35.6, Holy/Chaotic Flare +38.8, Diffusion/Chaotic Holy +42.2),
// Fell Forces +46.9/+50.0, Celestriad +56.4 (towers +65.5/+71.6/+77.6),
// Repeater +82 (hits +87..+89), Fell Forces +91.9/+95.0, Apocalypse +96
// (hits +103..+117), Entropy +119, Orchestra +126.7, Fell Forces +138.9/
// +142.0/+145.1, Forsaken +146 (opening hit +156.5; bait/ground/Bonds
// +161.6/+169.7/+177.9/+186.0 with pulses 3s after each of the first
// three), Forsaken Null begincast +191, cast +217.1, party Forsaken +221.5.
// The model's "~15:01 targetable" holds: P5 +0 landed at 14:57-15:06.
//
// Model corrections and answers (open questions numbered as in the model):
// - FELL FORCES IS A SPLIT ROLE STACK, not fixed per-victim damage. Every
//   member of a role group takes that role's ID (50771 tank, 50772 healer,
//   50773 DPS; confirmed by job across all pulls) and the damage divides:
//   a lone DPS took 221k where four share ~40-85k (1Vxz#5 +46.8). Each
//   volley applies Magic Vulnerability Up (1002941) to everyone hit. (Q1)
// - Strategy seen in both statics: after each Orchestra the Surprise Holy
//   tank solos the tank stack under an invulnerability (Living Dead /
//   Hallowed Ground / Superbolide) while the other tank stands elsewhere
//   (the Paladin joins the healer circle, which is harmless). After
//   Orchestra 2 the invuln covers volleys 1-2 only; volley 3 (+145) must
//   be shared. Shared: NW9t#4, 3kzF#2, ZADQ#11, dQ8w#9 all survived.
//   Solo: KZXy#7, ZADQ#3, ZADQ#5 (Paladin 325k+ overkill), dQ8w#2 (GNB)
//   all died; ZADQ#1 the Paladin's invuln was already gone at volley 2.
// - Flood: every Chaotic Flood stack hit every living player (no split in
//   29 pulls). Line hits (49769) land only on waves 3-4 (+25.3/+26.3), are
//   ~110-170k (survivable alone at full HP; lethal with the stack) and
//   apply Damage Down. 1Vxz#7 and q4K9#7 had 3-5 players caught at once
//   (a whole-group movement error; both pulls died within 20s). (Q2)
// - Maddening Orchestra: Surprise Flare/Holy DO fire early when the carrier
//   dies (Q6). A carrier death makes Flare Diffusion detonate immediately
//   and it then kills the whole party (~4-5M overkill): n3Td#17 (Paladin
//   walked to 20.6y from center and died with no killing ability, i.e. the
//   arena edge), bpAx#5, KZXy#11, 3kzF#18. At normal expiry Diffusion only
//   hits its carrier and the invulnerable Holy tank; a non-tank caught then
//   was standing too close (1Vxz#5, 2aVk#4, q4K9#9, 3kzF#2; all died).
//   Step-2 Holy targets are NOT in the cast's targetID when a circle hits
//   several players, so circles are tied to hits by sourceInstance.
// - Orchestra with a tank already dead is pure fallout: the second enmity
//   slot is a non-tank who then eats Flare (205k+, lethal). With fewer than
//   three eligible step-2 baiters alive, Holy goes onto the tanks, whose
//   Magic Vulnerability Up then makes Chaotic Flare lethal (3kzF#18,
//   NW9t#12). Both are skipped.
// - Celestriad: nine tower positions on a ~10y ring; each of three waves
//   lights four (Q3). A duo soak is ~90-150k each; a SOLO soak is ~1.2M
//   (always lethal); an empty tower fires Stardust Fire/Blizzard/Thunder III
//   (47942/47943/47944) ~1s later on the whole party with a 180s Damage Down
//   (a raid penalty, now excluded from the generic ffxiv-damage-down rule).
//   Soaking with the matching Resistance Down (Fire 1002902, Ice 1002903,
//   Lightning 1002998) is ~380k (lethal). Initial debuffs last 20s and
//   expire just before wave 3. Catastrophic Choice's cast ID (49742 first,
//   49743 second) does not name the element; the resolving cast does
//   (Quake 47946 / Tornado 47947). No tower priority was needed: when a
//   tower was under-filled with everyone alive, exactly the idle player(s)
//   soaked nothing (ZADQ#7 +71.6, KZXy#7 +77.6, q4K9#3 +71.6, rWVf#16). (Q4)
// - Stray Apocalypse hits (47933) are ~80-220k and apply Damage Down. Stray
//   Entropy never overlapped (always one hit per player); every Entropy
//   death followed an earlier exaflare hit on the same player. (Q2, Q5)
// - Forsaken: every Bonds stack hit every living player. Deaths there and
//   to the pulses/opening hit are healing checks. Forsaken (1005144) mid-
//   sequence comes from touching ground (cause 47927 / 50714) and removes
//   the player (death event ~2s later, no killing ability). After Null it
//   lands on everyone at once (+221.5) with deaths at +223.5. (Q7)
// - Damage deaths to Ultima Repeater (rWVf#16, PQVa#15, NW9t#7, ZADQ#7, all
//   at Repeater 2) and tank deaths to the post-Repeater-2 volleys are
//   healing/mitigation checks; not attributable from the log alone.
// - FFLogs death events land ~2.0s after the fatal hit throughout.
// - Pull-over threshold: no pull that reached 4 dead (net of raises)
//   mid-phase recovered; several ran 25-45s at 5+ dead before wiping.
//
// -- RULES IMPLEMENTED --
// Major unless noted; a hit that neither killed nor applied Damage Down is
// Minor. Damage Down counts as Major, matching ffxiv-damage-down.
//   ffxiv-uk-flood-line            caught by a Flood line
//   ffxiv-uk-flood-group           3+ caught by one wave (player-less;
//                                   Raid if 3+ died, else Minor)
//   ffxiv-uk-fell-forces-missed    non-tank absent from their role stack
//                                   (Major if a role-mate who took it died)
//   ffxiv-uk-fell-forces-overlap   one player took two role stacks
//   ffxiv-uk-fell-forces-unshared  a tank died soloing the tank stack while
//                                   the other tank was alive and absent;
//                                   flags the absent tank
//   ffxiv-uk-orchestra-enmity      both tanks alive but a non-tank got a
//                                   Surprise aura; flags the tank without one
//   ffxiv-uk-orchestra-flare-overlap  one Flare circle hit 2+ players
//   ffxiv-uk-orchestra-holy        stood in another player's Holy, or took a
//                                   second Holy while vulnerable (only with
//                                   3+ eligible baiters and tanks holding
//                                   both auras)
//   ffxiv-uk-orchestra-diffusion   non-tank hit by an on-time Flare Diffusion
//   ffxiv-uk-orchestra-early-flare Surprise Flare carrier died, Diffusion hit
//                                   the party (Raid, player-less); the carrier
//                                   is also flagged when the death had no
//                                   killing ability (arena edge)
//   ffxiv-uk-chaotic-flare         a tank died to the shared Chaotic Flare
//                                   (skipped when the tank was hit by Holy
//                                   first, or the other tank was dead)
//   ffxiv-uk-tower-vulnerable      soaked a tower of an element they were
//                                   vulnerable to
//   ffxiv-uk-tower-missed          with all 8 alive, a tower got <2 soakers;
//                                   flags the player(s) who soaked nothing
//   ffxiv-uk-choice                hit by Quake/Tornado (wrong tower half)
//   ffxiv-uk-choice-group          3+ in one Quake/Tornado (player-less;
//                                   Raid if 3+ died, else Minor)
//   ffxiv-uk-apocalypse            hit by Stray Apocalypse (one error per
//                                   player, hit count in the description)
//   ffxiv-uk-entropy-overlap       two Stray Entropy spreads on one player
//                                   (never observed; kept from the model)
//   ffxiv-uk-forsaken-ground       touched Forsaken ground before Null
//                                   (3+ at once: player-less Raid)
//   ffxiv-uk-forsaken-null         Raid: Forsaken Null enrage completed
//   ffxiv-uk-collapse              Raid: 4 dead at once in Phase 5, when no
//                                   Phase 5 Raid came first
// Not flagged: Ultima Repeater / Forsaken / Bonds damage deaths, tank deaths
// to shared Fell Forces, Chaotic Holy, and anything after a tank died that
// only happened because enmity or bait slots shifted.
//
// -- GUIDE-DERIVED MODEL: PHASE 5, ULTIMATE/ULTIMA KEFKA --
// Scope: Dancing Mad (Ultimate), patch 7.51, final phase only. The game
// calls the transformed boss "Kefka"; "Ultima Kefka" is a guide nickname.
// This is research for later log verification and detection, not a rule set.
// Sources checked 2026-09-27:
//   https://thaliak.com/ultimates/umad/ (event timeline; modified 2026-07-04)
//   https://www.icy-veins.com/ffxiv/dancing-mad-ultimate-phase-5-guide
//   https://materiaraiding.com/ultimate/dmu
//   https://www.bubblemewraids.com/party-finder/p5
// Candidate IDs below come from a local FFLogs report's ability table and
// one sample pull's event types. They are useful leads, NOT a full check of
// variants, damage outcomes, target selection, or wipe signatures. No
// Phase 5 balance changes or hotfixes were found in these guides; counts
// and IDs should be rechecked against the user's report and its patch.
//
// -- PHASE BOUNDARY AND CHRONOLOGY --
// Phase 4 ends only if Kefka is below 25% before its final Ultima Upsurge.
// After the transition he becomes targetable in a new form. The Thaliak
// timeline puts this near 15:01 from pull start; all offsets below use that
// targetability as P5 +0. Times are guide approximations, not thresholds.
//   +00:07 Ultima Repeater #1: four raid hits around +08..+10.
//   +00:13/+16/+19 three Fell Forces volleys.
//   +00:24 Flood: four paired line sets and four Chaotic Flood stacks.
//   +00:37 Maddening Orchestra #1: random spreads + double tank Flare,
//           then proximity spreads + shared tankbuster, then delayed
//           Surprise Flare / Surprise Holy resolutions at ~+45.
//   +00:50/+53 two Fell Forces volleys.
//   +00:59 Celestriad assigns elemental vulnerabilities and towers;
//           tower waves at ~+01:08/+01:14/+01:20, with Catastrophic
//           Choice on waves 1 and 3.
//   +01:28 Ultima Repeater #2 (four hits), then Fell Forces at +01:35/+38.
//   +01:43 Stray Apocalypse exaflares (six alternating source sets);
//           +02:01 Stray Entropy eight spreads.
//   +02:09 Maddening Orchestra #2, same three steps as #1;
//           +02:22/+25/+28 three Fell Forces volleys.
//   +02:39 Forsaken begins the four-stack shrinking-arena sequence;
//           stack/ground hits ~+02:44/+52/+03:01/+03:09, with raid pulses
//           between. Forsaken Null is the terminal cast, resolving around
//           +03:40, then a short animation and party wipe.
// The mitigation sheet in this repo agrees with the 3 / 2 / 2 / 3 Fell
// Forces volley counts. One Materia paragraph says three after Repeater #2;
// its own mitigation sheet, Thaliak timeline, and Icy Veins say two.
// There is one boss, no adds to kill, and no resource bar documented here.
// Progression is a scripted clock plus boss HP: kill before Forsaken Null.
//
// -- ULTIMA REPEATER --
// Candidate IDs: 47936 enemy begincast/cast; 47937 hit cast/damage.
// What happens: two occurrences, each four heavy consecutive raid hits.
// Correct play: planned party mitigation and healing across all four hits;
// some groups apply mitigation before the boss becomes targetable.
// Failure: insufficient survival -> LOG SIGNAL: deaths to 47937 and
//   missing/expired mitigation or healing context; FAULT: not assignable
//   from damage alone; CONSEQUENCE: Major if a specific missed assignment
//   is confirmed, otherwise Raid if deaths make the pull unrecoverable.
// Not errors: all four hits and their damage on every living player.
//
// -- FELL FORCES --
// Candidate IDs: 50771/50772/50773, each enemy casts and player damage;
// verify which ID is tank, healer, and DPS in the report. The timeline
// names Fell Forces Tank / Healer / DPS as three simultaneous hits.
// What happens: one hit on first enmity (tank), one circular AoE on a
// random healer, and one on a random DPS per volley. The three damage
// values are fixed per victim, not divided among players in the circle;
// "role stacks" in strategy guides means group positioning, not a shared
// damage stack. Volleys run 3 before Flood, 2 after Orchestra #1, 2 after
// Repeater #2, and 3 after Orchestra #2.
// Correct play: separate tank/healer/DPS groups so their circles do not
// overlap; the targeted healer's partner and DPS group intentionally take
// their own role hit. A common layout is tanks N, healers SW, DPS SE.
// Failure: groups overlap -> LOG SIGNAL: a player takes another role's
//   Fell Forces hit in addition to their own; FAULT: positioning offender
//   needs role/position evidence, not automatically the victim; CONSEQUENCE:
//   Minor for a survivable extra hit, Major if it kills or causes a wipe.
// Failure: tank loses first enmity -> LOG SIGNAL: tank hit on non-tank;
//   FAULT: tank/enmity assignment only if independently established;
//   CONSEQUENCE: Major if lethal. A dead tank can cause ordinary retargeting.
// Not errors: normal one-per-group AoE damage, including multiple people
// in the healer/DPS circles; a deliberate invulnerable tank may solo hits.
//
// -- FLOOD / CHAOTIC FLOOD --
// Candidate IDs: Flood 49471 enemy begincast/cast; line resolve 49769
// enemy cast; Chaotic Flood 47951 cast/damage. Damage Down candidate
// player aura 1002911 on a line hit; confirm the actual penalty ID.
// What happens: four quick waves, each two diagonal line AoEs (one near a
// wall and one crossing center) plus a full-party stack on a random player.
// Lines rotate clockwise or counterclockwise. Two initial cardinals avoid
// the first line; only one stays safe from the second. Follow the rotation
// one quadrant after each hit while staying together for all four stacks.
// Failure: caught by line -> LOG SIGNAL: Flood damage/1002911 Damage Down
//   near a wave; FAULT: hit player if movement failure is visible;
//   CONSEQUENCE: Minor unless death or lost DPS causes wipe (Major).
// Failure: stack split or missed -> LOG SIGNAL: missing stack recipients,
//   extra deaths to Chaotic Flood; FAULT: separation requires positions,
//   not the randomly targeted player by default; CONSEQUENCE: Major/Raid.
// Not errors: all four Chaotic Flood stacks and their expected party damage.
//
// -- MADDENING ORCHESTRA (TWICE) --
// Candidate IDs: 47952 begincast/cast, 47953 follow-up cast; 47954 Flare
//   damage, 47956 Holy damage, 47955 Chaotic Flare damage, 47957 Flare
//   Diffusion damage, 47958 Chaotic Holy damage. Player auras: Surprise
//   Flare 1005350, Surprise Holy 1005351, Magic Vulnerability Up 1002941.
// Step 1: top two enmity players get separate Flare AoE busters. The first
// gets Surprise Flare, second Surprise Holy. Three random non-tanks get
// Holy spread AoEs and a longer Magic Vulnerability Up.
// Step 2: the three non-tanks *not* hit in step 1 move closest to Kefka
// and take Holy Proximity spreads. Tanks share Chaotic Flare at the same
// time. Spread targets must not clip each other, especially anyone with
// Magic Vulnerability Up. The first Holy three stay out of the close bait.
// Step 3: Surprise Flare expires as massive Flare Diffusion centered on
// its tank, and Surprise Holy expires as a smaller Chaotic Holy stack.
// The Flare tank goes to the edge. The Holy tank takes boss enmity to hold
// Kefka central. Common plans have the Holy tank invuln and solo Holy,
// possibly standing in Diffusion; other plans share Holy with party.
// Failure: non-tank is top-two enmity -> LOG SIGNAL: Flare / surprise
//   aura on non-tank; FAULT: enmity holder only after excluding tank death
//   fallout; CONSEQUENCE: Major if lethal or chain wipe.
// Failure: Holy groups overlap or wrong three bait second set -> LOG
//   SIGNAL: Holy damage on previously hit/vulnerable player, or multiple
//   circles hit one victim; FAULT: baiter/overlap needs position evidence;
//   CONSEQUENCE: Major if lethal, otherwise Minor.
// Failure: shared tankbuster not shared/mitigated -> LOG SIGNAL: death to
//   Chaotic Flare; FAULT: tank assignment from plan; CONSEQUENCE: Major.
// Failure: Flare Diffusion hits party or boss is dragged to edge -> LOG
//   SIGNAL: 47957 damage on non-tanks, later geometry displaced; FAULT:
//   Flare carrier / enmity swap only with position and cast evidence;
//   CONSEQUENCE: Major, Raid if the next sequence is unrecoverable.
// Removal: Surprise auras resolve on expiry into Diffusion/Holy. Whether
// death or dispel also fires them is not established. Magic Vulnerability
// Up expires naturally; there is no player dispel assignment in guides.
// Not errors: both Flare hits, six intended Holy targets across two sets,
// shared Chaotic Flare, and chosen Holy-solo/invuln strategy damage.
//
// -- CELESTRIAD / CATASTROPHIC CHOICE --
// Candidate IDs: Celestriad 47938 begincast/cast; initial player auras
// Fire Resistance Down II 1002902, Ice 1002903, Lightning 1002998;
// Fire III 47939, Blizzard III 47940, Thunder III 47941 tower casts/damage;
// Catastrophic Choice 49742/49743 begincast/cast; Quake 47946 and Tornado
// 47947 casts. Confirm which Choice ID maps to which element/outcome.
// What happens: two players start with each elemental vulnerability, and
// two have none. The guides describe nine visible towers (three adjacent
// towers per element), in a random rotational arrangement. Three waves
// light four two-person towers each: two elements have one active tower,
// and one element has two. Each player pair must avoid the element to
// which it is vulnerable. Tower hits add the tower's resistance debuff;
// initial ~20s debuffs expire just before the last wave. First and third
// waves also overlap Catastrophic Choice: earth/yellow staff -> central
// point-blank Quake, stand in outer half of tower; wind/green -> Tornado
// donut, stand in inner half. This assumes Kefka is centered.
// Correct play: pairs rotate through *safe* elements, with the two
// initially unmarked players filling the duplicate-element tower. Actual
// clockwise/leftmost priority is strategy-specific and sources disagree;
// judge element safety and successful two-person soaks before assignment.
// Failure: underfilled tower -> LOG SIGNAL: absent expected two-player
// Fire III/Blizzard III/Thunder III hit and a raidwide Damage Down 1002911;
// FAULT: assigned soaker only if plan/tower position is known; else Raid;
// CONSEQUENCE: Raid if the DPS loss makes the clear impossible.
// Failure: wrong element or repeated vulnerability -> LOG SIGNAL: tower
// hit on player with matching active Resistance Down, likely lethal;
// FAULT: player if assignment and aura history establish it; Major/Raid.
// Failure: wrong Choice half -> LOG SIGNAL: Quake or Tornado damage on a
// tower soaker (possibly Damage Down/death); FAULT: hit player if position
// supports it; CONSEQUENCE: Minor if survived, Major if killed.
// Removal: initial resistance auras expire naturally; each tower adds a
// new resistance aura lasting through the mechanic. Death removal and
// whether an empty tower still emits a normal hit need log verification.
// Not errors: correct two-person elemental hits and Choice casts with no
// player hit. An underfilled tower's raidwide Damage Down has no safe
// individual attribution without the raid's tower priority.
//
// -- STRAY APOCALYPSE / STRAY ENTROPY --
// Candidate IDs: Stray Apocalypse 47931/47932 begincast/cast, 47933
// repeated moving cast; Stray Entropy 47934 begincast/cast and 47935
// eight-player damage. Confirm exaflare damage ID on an actual collision.
// What happens: six alternating sets of two fast-moving exaflares, three
// from NW and three from NE. Each pair has a gap. Icy Veins allows either
// starting side; the Thaliak timeline claims NW always starts. Exaflares
// snapshot early and leave a melee-range safe row. At the last set all
// eight players receive a personal Stray Entropy spread.
// Correct play: move from each safe row into the next while preserving
// space for the final eight clock spreads; ranged may take outer spots.
// Failure: exaflare collision -> LOG SIGNAL: 47933 or distinct damage plus
// Damage Down 1002911; FAULT: hit player; CONSEQUENCE: Minor/Major.
// Failure: two Entropy spreads overlap -> LOG SIGNAL: extra 47935 hits
// per victim and/or death; FAULT: source requires marker/position evidence,
// never automatically the victim; CONSEQUENCE: Major, Raid if wipe.
// Not errors: eight single spread hits and the exaflare cast train.
//
// -- FORSAKEN / FORSAKEN BONDS / FORSAKEN NULL --
// Candidate IDs: 47925 Forsaken opening cast/damage; 47928 bait AoE
// begincast/cast; 47927 Forsaken Ground begincast/cast; 47929 Forsaken
// Bonds damage/cast; 47926 intervening Forsaken raid pulse damage/cast;
// 1005144 player Forsaken aura; 47930 terminal begincast/cast/damage.
// What happens: opening heavy raidwide, then four ~8s cycles. Each cycle
// baits a large AoE at the party's nearest cardinal/intercardinal, drops
// two persistent ground hazards (first may include center), and gives a
// full-party Forsaken Bonds stack. A heavy raid pulse follows each of the
// first three stacks. The hazards shrink available floor. Touching one
// later inflicts Forsaken and removes the player from the fight: no raise.
// Correct play: move together and WAIT for each bait/stack marker to
// appear before rotating. Guide routes vary: S->W->N->E->S, or waymark
// C->4->1->2->B with a conditional last move to 1. These are plans, not
// inherent fault rules; bait placement depends on the party's position.
// Failure: bait covers future safe ground -> LOG SIGNAL: 47928 location
// followed by lost safe space/ground deaths; FAULT: player not in log from
// random target alone, needs positions/raid plan; CONSEQUENCE: Raid.
// Failure: leaves stack or stack misses players -> LOG SIGNAL: too few
// recipients of 47929 and deaths; FAULT: absence requires position/health
// context; CONSEQUENCE: Major, Raid if progression becomes impossible.
// Failure: enters ground -> LOG SIGNAL: 1005144 Forsaken application,
// loss of targetability/raise, perhaps a death without ordinary killer;
// FAULT: affected player if not forced by earlier lost floor; Major/Raid.
// Final hard enrage: Forsaken Null completes after a long cast; ensuing
// animation applies Forsaken to all and ends the fight. LOG SIGNAL:
// completed 47930 and party-wide 1005144/deaths with boss alive;
// FAULT: no individual from the enrage alone; CONSEQUENCE: Raid.
// Not errors: the four Bonds stacks, scheduled Forsaken raid pulses, and
// damage chosen for the group's mitigation plan. Terminal enrage damage
// marks a cutoff, not eight player mistakes.
//
// -- OPEN QUESTIONS FOR LOG VERIFICATION --
// 1. Which Fell Forces ID is tank/healer/DPS, and how are splash victims
//    distinguished from the primary target? What is the normal radius?
// 2. Which Flood, Apocalypse, Quake, and Tornado IDs actually deal damage
//    on a failed dodge, and which apply Damage Down versus killing outright?
// 3. Celestriad guides say nine visible towers but four resolve in each of
//    three waves (twelve resolutions); do locations reactivate, or is a
//    guide count wrong? What cast/damage marks an underfilled tower?
// 4. Tower priority descriptions conflict on left/right duplicate tower.
//    Which priority did this group use, and can tower coordinates identify
//    the absent soaker before blaming any player?
// 5. Does Stray Apocalypse always begin NW or can NE start as Icy Veins
//    says? Do exaflare casts carry real positions through every step?
// 6. Does Surprise Flare/Holy fire on death, or only timed expiry? Are
//    these auras dispellable? What is the range of each delayed explosion?
// 7. Does 1005144 Forsaken come from both the persistent ground and Null?
//    What is the exact no-raise/death event signature and terminal cutoff?
// 8. When a prior death changes enmity or a role bait, which later hits
//    are merely fallout? Do not turn those into new player accusations.

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent, ErrorSeverity } from "@/types/PullError";
import { compassBearingOf, distanceBetween, distanceFromCenter } from "@/lib/mechanics/geometry";
import {
  RAID_MARKER_SORT_OFFSET_MS, yd, kFmt, joinNames, playerError, rezzedAt, debuffIntervals,
} from "@/lib/mechanics/wow/common";

export const UK_FLOOD_LINE_RULE_ID           = "ffxiv-uk-flood-line";
export const UK_FLOOD_GROUP_RULE_ID          = "ffxiv-uk-flood-group";
export const UK_FELL_MISSED_RULE_ID          = "ffxiv-uk-fell-forces-missed";
export const UK_FELL_OVERLAP_RULE_ID         = "ffxiv-uk-fell-forces-overlap";
export const UK_FELL_UNSHARED_RULE_ID        = "ffxiv-uk-fell-forces-unshared";
export const UK_ENMITY_RULE_ID               = "ffxiv-uk-orchestra-enmity";
export const UK_FLARE_OVERLAP_RULE_ID        = "ffxiv-uk-orchestra-flare-overlap";
export const UK_HOLY_RULE_ID                 = "ffxiv-uk-orchestra-holy";
export const UK_DIFFUSION_RULE_ID            = "ffxiv-uk-orchestra-diffusion";
export const UK_EARLY_FLARE_RULE_ID          = "ffxiv-uk-orchestra-early-flare";
export const UK_CHAOTIC_FLARE_RULE_ID        = "ffxiv-uk-chaotic-flare";
export const UK_TOWER_VULNERABLE_RULE_ID     = "ffxiv-uk-tower-vulnerable";
export const UK_TOWER_MISSED_RULE_ID         = "ffxiv-uk-tower-missed";
export const UK_CHOICE_RULE_ID               = "ffxiv-uk-choice";
export const UK_CHOICE_GROUP_RULE_ID         = "ffxiv-uk-choice-group";
export const UK_APOCALYPSE_RULE_ID           = "ffxiv-uk-apocalypse";
export const UK_ENTROPY_OVERLAP_RULE_ID      = "ffxiv-uk-entropy-overlap";
export const UK_FORSAKEN_GROUND_RULE_ID      = "ffxiv-uk-forsaken-ground";
export const UK_FORSAKEN_NULL_RULE_ID        = "ffxiv-uk-forsaken-null";
export const UK_COLLAPSE_RULE_ID             = "ffxiv-uk-collapse";

const ULTIMA_REPEATER_CAST = 47936;
const FLOOD_LINE           = 49769;
const FELL_FORCES: Record<PlayerInfo["role"], number> = { Tank: 50771, Healer: 50772, DPS: 50773 };
const FELL_FORCES_IDS      = new Set(Object.values(FELL_FORCES));
const ORCHESTRA_CAST       = 47952;
const FLARE                = 47954;
const HOLY                 = 47956;
const CHAOTIC_FLARE        = 47955;
const FLARE_DIFFUSION      = 47957;
const SURPRISE_FLARE       = 1005350;
const SURPRISE_HOLY        = 1005351;
const CELESTRIAD_CAST      = 47938;
const TOWERS: Record<number, { element: string; resistId: number; resistName: string }> = {
  47939: { element: "Fire",     resistId: 1002902, resistName: "Fire Resistance Down II" },
  47940: { element: "Blizzard", resistId: 1002903, resistName: "Ice Resistance Down II" },
  47941: { element: "Thunder",  resistId: 1002998, resistName: "Lightning Resistance Down II" },
};
const QUAKE                = 47946;
const TORNADO              = 47947;
const STRAY_APOCALYPSE     = 47933;
const STRAY_ENTROPY        = 47935;
const FORSAKEN_AURA        = 1005144;
const FORSAKEN_NULL        = 47930;
const DAMAGE_DOWN          = 1002911;

// Tank invulnerabilities seen soloing the tank Fell Forces (see header).
const INVULN_BUFFS = ["hallowed ground", "living dead", "walking dead", "superbolide", "holmgang"];

// FFLogs logs the death event ~2.0s after the fatal hit (every P5 death in
// the 29 verified pulls). A hit "killed" its target when the death event
// follows within this window.
const DEATH_EVENT_LAG_MS = 2000;
const DIED_FROM_HIT_MS   = 3000;
// Collapse marker: see header (no pull recovered from 4 dead mid-phase).
const COLLAPSE_DEAD_COUNT = 4;
// A "group" error replaces per-player errors when this many were caught at
// once (1Vxz#7 / q4K9#7 Flood, 2aVk#4 Quake: 3-5 players).
const GROUP_SIZE = 3;
// ...and it is the cutoff (Raid) when it killed this many: q4K9#7 Flood (5)
// and 2aVk#4 Quake (4) ended their pulls; rWVf#16 Tornado (2 dead) ran 55s on.
const GROUP_RAID_DEATHS = 3;

// ── shared helpers ──────────────────────────────────────────────────────────

type Hit = { p: PlayerInfo; e: PlayerEvent };

type Life = {
  /** Alive and still in the fight (not dead, not removed by Forsaken). */
  alive: (p: PlayerInfo, t: number) => boolean;
  /** The death this hit caused, if the player's death event follows it closely. */
  diedFrom: (p: PlayerInfo, hitT: number) => DeathEvent | undefined;
  /** Every stretch of time each player was out, for the collapse marker. */
  outIntervals: { p: PlayerInfo; start: number; end: number }[];
};

function buildLife(players: PlayerInfo[], deaths: DeathEvent[]): Life {
  const outIntervals: Life["outIntervals"] = [];
  for (const p of players) {
    const own = deaths.filter((d) => d.player === p.name).sort((a, b) => a.timestamp - b.timestamp);
    own.forEach((d, i) => {
      const next = own[i + 1]?.timestamp ?? Infinity;
      // A later death proves a raise even when the raise itself isn't visible
      // (e.g. a capture that starts mid-pull).
      const end = rezzedAt(p, d.timestamp, next) ?? next - DEATH_EVENT_LAG_MS - 100;
      outIntervals.push({ p, start: d.timestamp - DEATH_EVENT_LAG_MS - 100, end });
    });
    for (const w of debuffIntervals(p, FORSAKEN_AURA)) outIntervals.push({ p, start: w.start, end: Infinity });
  }
  return {
    outIntervals,
    alive: (p, t) => !outIntervals.some((w) => w.p === p && t >= w.start && t < w.end),
    diedFrom: (p, hitT) => deaths.find((d) => d.player === p.name && d.timestamp >= hitT && d.timestamp <= hitT + DIED_FROM_HIT_MS),
  };
}

function hitsIn(players: PlayerInfo[], abilityId: number, from: number, to: number): Hit[] {
  const out: Hit[] = [];
  for (const p of players) {
    for (const e of p.damageTaken) {
      if (e.abilityId === abilityId && e.timestamp >= from && e.timestamp <= to) out.push({ p, e });
    }
  }
  return out.sort((a, b) => a.e.timestamp - b.e.timestamp);
}

/** Splits time-sorted items into runs whose consecutive gaps are <= gapMs. */
function clusterByTime<T>(items: T[], time: (x: T) => number, gapMs: number): T[][] {
  const sorted = [...items].sort((a, b) => time(a) - time(b));
  const out: T[][] = [];
  for (const x of sorted) {
    const last = out[out.length - 1];
    if (last && time(x) - time(last[last.length - 1]) <= gapMs) last.push(x);
    else out.push([x]);
  }
  return out;
}

function gotDamageDown(p: PlayerInfo, causeId: number, t: number): boolean {
  return p.debuffs.some((e) =>
    e.abilityId === DAMAGE_DOWN && e.debuffStatus === "applied" && Math.abs(e.timestamp - t) <= 1500 &&
    (e.causeAbilityId === undefined || e.causeAbilityId === causeId));
}

function hasInvuln(e: PlayerEvent): boolean {
  return (e.activeBuffNames ?? []).some((n) => INVULN_BUFFS.includes(n.toLowerCase()));
}

function direction(x: number, y: number): string {
  return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(compassBearingOf(x, y) / 45) % 8];
}

function raidError(ruleId: string, name: string, description: string, timestamp: number, abilityId: number, abilityName: string, severity: ErrorSeverity = "Raid"): PullError {
  return { ruleId, severity, name, description, timestamp, abilityId, abilityName };
}

const uniq = <T,>(xs: T[]) => [...new Set(xs)];
const names = (hs: Hit[]) => joinNames(uniq(hs.map((h) => h.p.name)));

// ── Flood ───────────────────────────────────────────────────────────────────

function detectFlood(players: PlayerInfo[], life: Life): PullError[] {
  const errors: PullError[] = [];
  for (const wave of clusterByTime(hitsIn(players, FLOOD_LINE, -Infinity, Infinity), (h) => h.e.timestamp, 500)) {
    const died = wave.filter((h) => life.diedFrom(h.p, h.e.timestamp));
    if (uniq(wave.map((h) => h.p)).length >= GROUP_SIZE) {
      errors.push(raidError(UK_FLOOD_GROUP_RULE_ID, "Group Caught by Flood",
        `${wave.length} players were caught by the same Flood line wave (${names(wave)})` +
        (died.length ? `; ${names(died)} died` : "") +
        ". The party moved to the wrong side of the rotation together, so no single player is named. Unresolvable from here.",
        wave[0].e.timestamp, FLOOD_LINE, "Flood", died.length >= GROUP_RAID_DEATHS ? "Raid" : "Minor"));
      continue;
    }
    for (const { p, e } of wave) {
      const death = life.diedFrom(p, e.timestamp);
      errors.push(playerError(p, {
        ruleId: UK_FLOOD_LINE_RULE_ID,
        severity: death || gotDamageDown(p, FLOOD_LINE, e.timestamp) ? "Major" : "Minor",
        name: "Caught by Flood",
        description: `Was caught by a Flood line (${kFmt(e.amount ?? 0)})` +
          (death ? ", which killed them together with the Chaotic Flood stack." : " and took Damage Down."),
        timestamp: e.timestamp, abilityId: FLOOD_LINE, abilityName: "Flood",
      }));
    }
  }
  return errors;
}

// ── Fell Forces ─────────────────────────────────────────────────────────────

function detectFellForces(players: PlayerInfo[], life: Life, enemyCasts: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  const casts = enemyCasts.filter((c) => FELL_FORCES_IDS.has(c.abilityId));
  for (const volley of clusterByTime(casts, (c) => c.timestamp, 500)) {
    const t = volley[0].timestamp;
    const hits = [...FELL_FORCES_IDS].flatMap((id) => hitsIn(players, id, t - 300, t + 1500));
    const idsOf = (p: PlayerInfo) => new Set(hits.filter((h) => h.p === p).map((h) => h.e.abilityId));
    const aliveNow = players.filter((p) => life.alive(p, t - 200));
    const roleName = (id: number) => (Object.keys(FELL_FORCES) as PlayerInfo["role"][]).find((r) => FELL_FORCES[r] === id)!.toLowerCase();

    // One player inside two role circles. When a role group is entirely dead
    // its stack retargets onto someone else — fallout, not an overlap (all
    // four doubles in the verified pulls were this).
    const roleAlive = (id: number) => aliveNow.some((p) => FELL_FORCES[p.role] === id);
    const overlapped = new Set<PlayerInfo>();
    for (const p of aliveNow) {
      const ids = idsOf(p);
      if (ids.size < 2 || [...ids].some((id) => !roleAlive(id))) continue;
      overlapped.add(p);
      const death = hits.filter((h) => h.p === p).map((h) => life.diedFrom(p, h.e.timestamp)).find(Boolean);
      errors.push(playerError(p, {
        ruleId: UK_FELL_OVERLAP_RULE_ID, severity: death ? "Major" : "Minor",
        name: "Fell Forces Stacks Overlapped",
        description: `Took both the ${[...ids].map(roleName).join(" and the ")} Fell Forces stacks in one volley — the role groups were standing too close together${death ? ", and it killed them" : ""}.`,
        timestamp: t, abilityId: FELL_FORCES[p.role], abilityName: "Fell Forces",
      }));
    }

    // A non-tank missing from their own role stack while it landed on a role-mate.
    for (const role of ["Healer", "DPS"] as const) {
      const id = FELL_FORCES[role];
      const takers = hits.filter((h) => h.e.abilityId === id && h.p.role === role);
      if (takers.length === 0) continue; // no role-mate took it: the whole group is dead or elsewhere
      const takerDied = takers.filter((h) => life.diedFrom(h.p, h.e.timestamp));
      for (const p of aliveNow) {
        if (p.role !== role || overlapped.has(p) || idsOf(p).has(id)) continue;
        const other = [...idsOf(p)];
        const avg = takers.reduce((s, h) => s + (h.e.amount ?? 0), 0) / takers.length;
        errors.push(playerError(p, {
          ruleId: UK_FELL_MISSED_RULE_ID, severity: takerDied.length ? "Major" : "Minor",
          name: "Missed Fell Forces Stack",
          description: `Wasn't in the ${role === "DPS" ? "DPS" : "healer"} Fell Forces stack` +
            (other.length ? ` (took the ${roleName(other[0])} stack instead)` : "") +
            (takers.length === 1 ? ` — ${names(takers)} took it alone (${kFmt(avg)})` : ` — ${names(takers)} split it (${kFmt(avg)} each)`) +
            (takerDied.length ? `, and ${names(takerDied)} died.` : "."),
          timestamp: t, abilityId: id, abilityName: "Fell Forces",
        }));
      }
    }

    // A tank dying alone in the tank stack while the other tank stayed out.
    const tankHits = hits.filter((h) => h.e.abilityId === FELL_FORCES.Tank);
    if (tankHits.length === 1 && tankHits[0].p.role === "Tank" && life.diedFrom(tankHits[0].p, tankHits[0].e.timestamp)) {
      const victim = tankHits[0];
      for (const other of aliveNow) {
        // Skip a tank who took some other stack: a dead role's stack retargeted onto them.
        if (other.role !== "Tank" || other === victim.p || idsOf(other).size) continue;
        errors.push(playerError(other, {
          ruleId: UK_FELL_UNSHARED_RULE_ID, severity: "Major",
          name: "Tank Fell Forces Not Shared",
          description: `Wasn't in the tank Fell Forces stack: ${victim.p.name} took it alone (${kFmt(victim.e.amount ?? 0)}, ` +
            `${hasInvuln(victim.e) ? "invulnerability still up" : "no invulnerability up"}) and died.`,
          timestamp: t, abilityId: FELL_FORCES.Tank, abilityName: "Fell Forces",
        }));
      }
    }
  }
  return errors;
}

// ── Maddening Orchestra ─────────────────────────────────────────────────────

function lastPositionBefore(p: PlayerInfo, t: number): { x: number; y: number } | undefined {
  const ev = [...p.damageTaken, ...p.healingReceived]
    .filter((e) => e.timestamp <= t && e.x !== undefined && e.y !== undefined)
    .sort((a, b) => b.timestamp - a.timestamp)[0];
  return ev ? { x: ev.x!, y: ev.y! } : undefined;
}

function detectOrchestra(players: PlayerInfo[], deaths: DeathEvent[], life: Life, enemyCasts: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const orch of enemyCasts.filter((c) => c.abilityId === ORCHESTRA_CAST)) {
    const T = orch.timestamp;
    const auraOf = (id: number) => players.filter((p) =>
      p.debuffs.some((e) => e.abilityId === id && e.debuffStatus === "applied" && e.timestamp >= T - 1000 && e.timestamp <= T + 2500));
    const flareCarrier = auraOf(SURPRISE_FLARE)[0];
    const holyCarrier = auraOf(SURPRISE_HOLY)[0];
    const carriers = [flareCarrier, holyCarrier].filter(Boolean) as PlayerInfo[];
    const tanks = players.filter((p) => p.role === "Tank");
    const bothTanksAlive = tanks.length >= 2 && tanks.filter((p) => life.alive(p, T)).length >= 2;
    const nonTankCarriers = carriers.filter((p) => p.role !== "Tank");
    const clean = bothTanksAlive && carriers.length === 2 && nonTankCarriers.length === 0;

    // 1. Enmity: a non-tank in the top two while both tanks lived.
    if (bothTanksAlive && nonTankCarriers.length) {
      const flareHits = hitsIn(nonTankCarriers, FLARE, T, T + 2500);
      for (const tank of tanks.filter((p) => !carriers.includes(p))) {
        const died = flareHits.filter((h) => life.diedFrom(h.p, h.e.timestamp));
        errors.push(playerError(tank, {
          ruleId: UK_ENMITY_RULE_ID, severity: "Major",
          name: "Lost Enmity at Maddening Orchestra",
          description: `Wasn't in the top two of enmity when Maddening Orchestra marked its Flare targets, so ${joinNames(nonTankCarriers.map((p) => p.name))} took a Flare and a Surprise aura instead` +
            (died.length ? `; ${names(died)} died to it.` : "."),
          timestamp: T, abilityId: FLARE, abilityName: "Flare",
        }));
      }
    }

    // 2. The two tank Flares overlapping.
    if (bothTanksAlive) {
      const byCircle = new Map<number | undefined, Hit[]>();
      for (const h of hitsIn(players, FLARE, T, T + 2500)) byCircle.set(h.e.sourceInstance, [...(byCircle.get(h.e.sourceInstance) ?? []), h]);
      const reported = new Set<PlayerInfo>();
      for (const circle of byCircle.values()) {
        const hitPlayers = uniq(circle.map((h) => h.p));
        if (hitPlayers.length < 2) continue;
        const died = circle.filter((h) => life.diedFrom(h.p, h.e.timestamp));
        for (const p of hitPlayers) {
          if (reported.has(p)) continue;
          reported.add(p);
          errors.push(playerError(p, {
            ruleId: UK_FLARE_OVERLAP_RULE_ID, severity: died.length ? "Major" : "Minor",
            name: "Flares Overlapped",
            description: `Was inside a Flare circle together with ${joinNames(hitPlayers.filter((x) => x !== p).map((x) => x.name))} — the two Flare targets didn't separate` +
              (died.length ? `, and ${names(died)} died.` : "."),
            timestamp: circle[0].e.timestamp, abilityId: FLARE, abilityName: "Flare",
          }));
        }
      }
    }

    // 3. Holy spreads (only when the tanks hold both auras, so the bait slots
    // haven't shifted, and there are three eligible step-2 baiters).
    if (clean) {
      const holy = hitsIn(players, HOLY, T, T + 6000).filter((h) => h.p.role !== "Tank");
      const step1 = holy.filter((h) => h.e.timestamp < T + 2500);
      const step2 = holy.filter((h) => h.e.timestamp >= T + 2500);
      const step1Players = new Set(step1.map((h) => h.p));
      const eligible = players.filter((p) => p.role !== "Tank" && !step1Players.has(p) && life.alive(p, T + 3000));
      const flagged = new Map<PlayerInfo, { sharedWith: Set<string>; vulnerable: boolean; hit: Hit; deadly: boolean }>();
      const flag = (h: Hit, sharedWith: PlayerInfo[], vulnerable: boolean, deadly: boolean) => {
        const f = flagged.get(h.p) ?? { sharedWith: new Set<string>(), vulnerable: false, hit: h, deadly: false };
        for (const x of sharedWith) f.sharedWith.add(x.name);
        f.vulnerable = f.vulnerable || vulnerable;
        f.deadly = f.deadly || deadly;
        flagged.set(h.p, f);
      };
      const steps = eligible.length >= 3 ? [step1, step2] : [step1];
      for (const step of steps) {
        const circles = new Map<number | undefined, Hit[]>();
        for (const h of step) circles.set(h.e.sourceInstance, [...(circles.get(h.e.sourceInstance) ?? []), h]);
        for (const circle of circles.values()) {
          const deadly = circle.some((h) => life.diedFrom(h.p, h.e.timestamp));
          const inCircle = uniq(circle.map((h) => h.p));
          if (inCircle.length >= 2) {
            for (const h of circle) flag(h, inCircle.filter((x) => x !== h.p), false, deadly);
          }
          if (step === step2) {
            for (const h of circle) if (step1Players.has(h.p)) flag(h, [], true, deadly);
          }
        }
      }
      for (const [p, f] of flagged) {
        const reasons = [
          ...(f.sharedWith.size ? [`shared a Holy circle with ${joinNames([...f.sharedWith])}`] : []),
          ...(f.vulnerable ? ["took a second Holy while still vulnerable from the first"] : []),
        ];
        errors.push(playerError(p, {
          ruleId: UK_HOLY_RULE_ID, severity: f.deadly ? "Major" : "Minor",
          name: "Holy Spread Overlapped",
          description: `At Maddening Orchestra, ${reasons.join(" and ")}` +
            (life.diedFrom(p, f.hit.e.timestamp) ? " — it killed them." : f.deadly ? " — someone in that circle died." : "."),
          timestamp: f.hit.e.timestamp, abilityId: HOLY, abilityName: "Holy",
        }));
      }
    }

    // 4/5. Flare Diffusion: on time (someone stood too close) or early (the
    // carrier died, which detonates it on the party).
    const diffusion = enemyCasts.find((c) => c.abilityId === FLARE_DIFFUSION && c.timestamp >= T && c.timestamp <= T + 9000);
    if (diffusion && flareCarrier && flareCarrier.role === "Tank" && bothTanksAlive) {
      const td = diffusion.timestamp;
      const hits = hitsIn(players, FLARE_DIFFUSION, td - 300, td + 1500);
      const partyHits = hits.filter((h) => h.p.role !== "Tank");
      const carrierDeath = deaths.find((d) => d.player === flareCarrier.name &&
        d.timestamp - DEATH_EVENT_LAG_MS - 300 >= T && d.timestamp - DEATH_EVENT_LAG_MS - 300 <= td);
      if (carrierDeath) {
        if (partyHits.length) {
          const died = partyHits.filter((h) => life.diedFrom(h.p, h.e.timestamp));
          if (!carrierDeath.killingAbilityGameId) {
            const pos = lastPositionBefore(flareCarrier, carrierDeath.timestamp - DEATH_EVENT_LAG_MS);
            errors.push(playerError(flareCarrier, {
              ruleId: UK_EARLY_FLARE_RULE_ID, severity: "Major",
              name: "Died Carrying Surprise Flare",
              description: `Died with no killing ability logged while carrying Surprise Flare` +
                (pos ? `, last seen ~${yd(distanceFromCenter(pos.x, pos.y))} yalms from center (the arena edge?)` : "") +
                `. Flare Diffusion detonated at once and hit ${partyHits.length} party members.`,
              timestamp: carrierDeath.timestamp, abilityId: FLARE_DIFFUSION, abilityName: "Flare Diffusion",
            }));
          }
          errors.push(raidError(UK_EARLY_FLARE_RULE_ID, "Flare Diffusion Detonated Early",
            `${flareCarrier.name} died carrying Surprise Flare (killed by ${carrierDeath.cause || "an unlogged cause"}), so Flare Diffusion went off early on the party: ${names(partyHits)} hit` +
            (died.length ? `, ${died.length} dead` : "") + ". Unresolvable from here.",
            td + RAID_MARKER_SORT_OFFSET_MS, FLARE_DIFFUSION, "Flare Diffusion"));
        }
      } else {
        const carrierHit = hits.find((h) => h.p === flareCarrier);
        const carrierPos = carrierHit?.e.x !== undefined ? { x: carrierHit.e.x!, y: carrierHit.e.y! } : lastPositionBefore(flareCarrier, td);
        for (const h of partyHits) {
          const death = life.diedFrom(h.p, h.e.timestamp);
          const gap = carrierPos && h.e.x !== undefined ? ` ~${yd(distanceBetween(carrierPos, { x: h.e.x!, y: h.e.y! }))} yalms from ${flareCarrier.name}` : "";
          const edge = carrierPos ? ` (the carrier was ~${yd(distanceFromCenter(carrierPos.x, carrierPos.y))} yalms from center)` : "";
          errors.push(playerError(h.p, {
            ruleId: UK_DIFFUSION_RULE_ID, severity: death ? "Major" : "Minor",
            name: "Hit by Flare Diffusion",
            description: `Was hit by ${flareCarrier.name}'s Flare Diffusion (${kFmt(h.e.amount ?? 0)}) standing${gap}${edge}` + (death ? " and died." : "."),
            timestamp: h.e.timestamp, abilityId: FLARE_DIFFUSION, abilityName: "Flare Diffusion",
          }));
        }
      }
    }

    // 6. The shared Chaotic Flare killing a tank.
    if (bothTanksAlive) {
      const cf = hitsIn(tanks, CHAOTIC_FLARE, T + 2500, T + 6000);
      for (const h of cf) {
        if (!life.diedFrom(h.p, h.e.timestamp)) continue;
        // Holy fell on the tanks (bait-slot fallout); it lands in the same instant as Chaotic Flare.
        if (hitsIn([h.p], HOLY, T, h.e.timestamp + 1000).length) continue;
        const partner = tanks.find((p) => p !== h.p && life.alive(p, T));
        if (!partner) continue;
        const shared = cf.some((x) => x.p === partner);
        errors.push(shared
          ? playerError(h.p, {
              ruleId: UK_CHAOTIC_FLARE_RULE_ID, severity: "Major",
              name: "Died to Chaotic Flare",
              description: `Died to the shared Chaotic Flare (${kFmt(h.e.amount ?? 0)}) though ${partner.name} shared it — not enough mitigation or healing on this tank.`,
              timestamp: h.e.timestamp, abilityId: CHAOTIC_FLARE, abilityName: "Chaotic Flare",
            })
          : playerError(partner, {
              ruleId: UK_CHAOTIC_FLARE_RULE_ID, severity: "Major",
              name: "Chaotic Flare Not Shared",
              description: `Didn't share Chaotic Flare: ${h.p.name} took it alone (${kFmt(h.e.amount ?? 0)}) and died.`,
              timestamp: h.e.timestamp, abilityId: CHAOTIC_FLARE, abilityName: "Chaotic Flare",
            }));
      }
    }
  }
  return errors;
}

// ── Celestriad towers + Catastrophic Choice ─────────────────────────────────

function detectCelestriad(players: PlayerInfo[], life: Life, enemyCasts: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  const cel = enemyCasts.find((c) => c.abilityId === CELESTRIAD_CAST);
  if (!cel) return errors;
  const towerCasts = enemyCasts.filter((c) => TOWERS[c.abilityId] && c.timestamp > cel.timestamp && c.timestamp < cel.timestamp + 30000);

  clusterByTime(towerCasts, (c) => c.timestamp, 1000).forEach((wave, wi) => {
    const tw = wave[0].timestamp;
    const towers = wave.map((c) => ({
      cast: c,
      soakers: hitsIn(players, c.abilityId, c.timestamp - 300, c.timestamp + 1500)
        .filter((h) => c.sourceInstance === undefined || h.e.sourceInstance === c.sourceInstance),
    }));
    const where = (c: EnemyEvent) => (c.x !== undefined && c.y !== undefined ? ` at ${direction(c.x, c.y)}` : "");

    // Soaking an element you're vulnerable to.
    const vulnerable = new Set<PlayerInfo>();
    for (const { cast, soakers } of towers) {
      const tower = TOWERS[cast.abilityId];
      for (const h of soakers) {
        if (!debuffIntervals(h.p, tower.resistId).some((w) => h.e.timestamp - 50 >= w.start && h.e.timestamp - 50 < w.end)) continue;
        vulnerable.add(h.p);
        const death = life.diedFrom(h.p, h.e.timestamp);
        errors.push(playerError(h.p, {
          ruleId: UK_TOWER_VULNERABLE_RULE_ID, severity: "Major",
          name: "Soaked a Vulnerable Tower",
          description: `Soaked the ${tower.element} tower${where(cast)} in Celestriad wave ${wi + 1} while carrying ${tower.resistName} (${kFmt(h.e.amount ?? 0)})` +
            (death ? " and died." : "."),
          timestamp: h.e.timestamp, abilityId: cast.abilityId, abilityName: `${tower.element} III`,
        }));
      }
    }

    // Under-filled towers with everyone alive (with anyone dead, the missing
    // soaker is death fallout).
    const under = towers.filter((t) => uniq(t.soakers.map((h) => h.p)).length < 2);
    const everyoneAlive = players.length >= 8 && players.every((p) => life.alive(p, tw - 200));
    if (!under.length || !everyoneAlive || wave.some((c) => c.sourceInstance === undefined)) return;
    const soaked = new Set(towers.flatMap((t) => t.soakers.map((h) => h.p)));
    const idle = players.filter((p) => !soaked.has(p));
    const consequence = under.map(({ cast, soakers }) => {
      const tower = TOWERS[cast.abilityId];
      if (!soakers.length) return `the ${tower.element} tower${where(cast)} went unsoaked (Stardust ${tower.element} III on the whole party)`;
      const solo = soakers[0];
      return `${solo.p.name} soaked the ${tower.element} tower${where(cast)} alone (${kFmt(solo.e.amount ?? 0)})${life.diedFrom(solo.p, solo.e.timestamp) ? " and died" : ""}`;
    }).join("; ");
    if (idle.length) {
      for (const p of idle) {
        errors.push(playerError(p, {
          ruleId: UK_TOWER_MISSED_RULE_ID, severity: "Major",
          name: "Missed Celestriad Tower",
          description: `Soaked no tower in Celestriad wave ${wi + 1}: ${consequence}.`,
          timestamp: tw, abilityId: under[0].cast.abilityId, abilityName: `${TOWERS[under[0].cast.abilityId].element} III`,
        }));
      }
    } else if (![...vulnerable].length) {
      const crowded = towers.filter((t) => uniq(t.soakers.map((h) => h.p)).length > 2).flatMap((t) => t.soakers);
      errors.push(raidError(UK_TOWER_MISSED_RULE_ID, "Celestriad Tower Under-soaked",
        `In Celestriad wave ${wi + 1} ${consequence}` + (crowded.length ? `, while ${names(crowded)} crowded into one tower` : "") +
        ". The log can't tell whose tower it was.", tw, under[0].cast.abilityId, `${TOWERS[under[0].cast.abilityId].element} III`, "Minor"));
    }
  });

  // Catastrophic Choice: Quake (stand outside) / Tornado (stand inside).
  const choice = [...hitsIn(players, QUAKE, cel.timestamp, cel.timestamp + 30000), ...hitsIn(players, TORNADO, cel.timestamp, cel.timestamp + 30000)];
  for (const group of clusterByTime(choice, (h) => h.e.timestamp, 1000)) {
    const id = group[0].e.abilityId;
    const nm = id === QUAKE ? "Quake" : "Tornado";
    const half = id === QUAKE ? "inner" : "outer";
    const died = group.filter((h) => life.diedFrom(h.p, h.e.timestamp));
    if (uniq(group.map((h) => h.p)).length >= GROUP_SIZE) {
      errors.push(raidError(UK_CHOICE_GROUP_RULE_ID, `Group Hit by ${nm}`,
        `${group.length} players were in the ${half} half of their towers when ${nm} resolved (${names(group)})` +
        (died.length ? `; ${names(died)} died within 3s` : "") + ". A group-wide read of Catastrophic Choice, so no single player is named.",
        group[0].e.timestamp, id, nm, died.length >= GROUP_RAID_DEATHS ? "Raid" : "Minor"));
      continue;
    }
    for (const { p, e } of group) {
      const death = life.diedFrom(p, e.timestamp);
      errors.push(playerError(p, {
        ruleId: UK_CHOICE_RULE_ID, severity: death || gotDamageDown(p, id, e.timestamp) ? "Major" : "Minor",
        name: `Hit by ${nm}`,
        description: `Stood in the ${half} half of the tower when Catastrophic Choice resolved as ${nm} (${kFmt(e.amount ?? 0)})` +
          (death ? " and died." : " and took Damage Down."),
        timestamp: e.timestamp, abilityId: id, abilityName: nm,
      }));
    }
  }
  return errors;
}

// ── Stray Apocalypse / Stray Entropy ────────────────────────────────────────

function detectStray(players: PlayerInfo[], deaths: DeathEvent[], life: Life): PullError[] {
  const errors: PullError[] = [];
  for (const p of players) {
    const hits = p.damageTaken.filter((e) => e.abilityId === STRAY_APOCALYPSE);
    if (hits.length) {
      const last = hits[hits.length - 1].timestamp;
      const death = hits.map((e) => life.diedFrom(p, e.timestamp)).find(Boolean);
      const entropyDeath = !death && deaths.find((d) => d.player === p.name && d.killingAbilityGameId === STRAY_ENTROPY && d.timestamp > last && d.timestamp < last + 15000);
      const dd = hits.some((e) => gotDamageDown(p, STRAY_APOCALYPSE, e.timestamp));
      const total = hits.reduce((s, e) => s + (e.amount ?? 0), 0);
      errors.push(playerError(p, {
        ruleId: UK_APOCALYPSE_RULE_ID, severity: death || entropyDeath || dd ? "Major" : "Minor",
        name: "Hit by Stray Apocalypse",
        description: `Was hit by Stray Apocalypse exaflares ${hits.length === 1 ? "once" : `${hits.length} times`} (${kFmt(total)} total)` +
          (death ? " and died." : entropyDeath ? ", then died to their Stray Entropy spread." : dd ? " and took Damage Down." : "."),
        timestamp: hits[0].timestamp, abilityId: STRAY_APOCALYPSE, abilityName: "Stray Apocalypse",
      }));
    }
    const entropy = p.damageTaken.filter((e) => e.abilityId === STRAY_ENTROPY);
    for (const group of clusterByTime(entropy, (e) => e.timestamp, 1000)) {
      if (group.length < 2) continue;
      errors.push(playerError(p, {
        ruleId: UK_ENTROPY_OVERLAP_RULE_ID, severity: life.diedFrom(p, group[0].timestamp) ? "Major" : "Minor",
        name: "Stray Entropy Overlapped",
        description: `Was hit by ${group.length} Stray Entropy spreads at once — the spread positions overlapped.`,
        timestamp: group[0].timestamp, abilityId: STRAY_ENTROPY, abilityName: "Stray Entropy",
      }));
    }
  }
  return errors;
}

// ── Forsaken ────────────────────────────────────────────────────────────────

function detectForsakenGround(players: PlayerInfo[], life: Life, nullT: number): PullError[] {
  const errors: PullError[] = [];
  const firstApps: Hit[] = [];
  for (const p of players) {
    const e = p.debuffs.find((d) => d.abilityId === FORSAKEN_AURA && d.debuffStatus === "applied" && d.timestamp < nullT && life.alive(p, d.timestamp - 100));
    if (e) firstApps.push({ p, e });
  }
  for (const group of clusterByTime(firstApps, (h) => h.e.timestamp, 1000)) {
    if (group.length >= GROUP_SIZE) {
      errors.push(raidError(UK_FORSAKEN_GROUND_RULE_ID, "Group Touched Forsaken Ground",
        `${group.length} players touched Forsaken ground within a second (${names(group)}) and were removed from the fight. Unresolvable from here.`,
        group[0].e.timestamp + RAID_MARKER_SORT_OFFSET_MS, FORSAKEN_AURA, "Forsaken"));
      continue;
    }
    for (const { p, e } of group) {
      errors.push(playerError(p, {
        ruleId: UK_FORSAKEN_GROUND_RULE_ID, severity: "Major",
        name: "Touched Forsaken Ground",
        description: "Touched a Forsaken ground hazard and was removed from the fight (no raise possible).",
        timestamp: e.timestamp, abilityId: FORSAKEN_AURA, abilityName: "Forsaken",
      }));
    }
  }
  return errors;
}

// ── entry point ─────────────────────────────────────────────────────────────

/**
 * Phase 5 (Ultimate Kefka) errors. Returns [] for pulls that never reach
 * Phase 5 (no completed Ultima Repeater cast).
 */
export function detectUltimateKefkaErrors(players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[]): PullError[] {
  const anchor = enemyCasts.find((c) => c.abilityId === ULTIMA_REPEATER_CAST);
  if (!anchor) return [];
  const life = buildLife(players, deathEvents);
  const nullCast = enemyCasts.find((c) => c.abilityId === FORSAKEN_NULL);
  const nullT = nullCast?.timestamp ?? Infinity;

  const errors = [
    ...detectFlood(players, life),
    ...detectFellForces(players, life, enemyCasts),
    ...detectOrchestra(players, deathEvents, life, enemyCasts),
    ...detectCelestriad(players, life, enemyCasts),
    ...detectStray(players, deathEvents, life),
    ...detectForsakenGround(players, life, nullT),
  ];

  // Pull-over markers: the enrage, or the first moment 4 are out at once —
  // each only if no Phase 5 Raid error came earlier.
  const firstRaid = () => Math.min(...errors.filter((e) => e.severity === "Raid").map((e) => e.timestamp));
  const outAt = (t: number) => players.filter((p) => !life.alive(p, t));
  const collapseT = life.outIntervals.map((w) => w.start).sort((a, b) => a - b)
    .find((t) => t >= anchor.timestamp - 5000 && t < nullT && outAt(t).length >= COLLAPSE_DEAD_COUNT);
  if (collapseT !== undefined && collapseT < firstRaid()) {
    const who = outAt(collapseT).map((p) => p.name);
    errors.push(raidError(UK_COLLAPSE_RULE_ID, "Phase 5 Collapse",
      `${who.length} players were dead or removed at once (${joinNames(who)}) — no Phase 5 pull has recovered from that. Treated as the cutoff point.`,
      collapseT + DEATH_EVENT_LAG_MS + RAID_MARKER_SORT_OFFSET_MS, 0, "Deaths"));
  }
  if (nullCast && nullCast.timestamp < firstRaid()) {
    const hp = nullCast.hitPoints !== undefined && nullCast.maxHitPoints ? ` with Kefka at ${(100 * nullCast.hitPoints / nullCast.maxHitPoints).toFixed(1)}%` : "";
    errors.push(raidError(UK_FORSAKEN_NULL_RULE_ID, "Forsaken Null (Enrage)",
      `Forsaken Null completed${hp} — the hard enrage. The DPS check wasn't met.`,
      nullCast.timestamp, FORSAKEN_NULL, "Forsaken Null"));
  }
  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
