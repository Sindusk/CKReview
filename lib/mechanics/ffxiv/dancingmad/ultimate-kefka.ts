// lib/mechanics/ffxiv/dancingmad/ultimate-kefka.ts
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
