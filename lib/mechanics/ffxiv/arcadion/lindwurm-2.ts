// lib/mechanics/ffxiv/arcadion/lindwurm-2.ts
//
// -- GUIDE-DERIVED MODEL: LINDWURM II (M12S P2) --
// AAC Heavyweight M4 (Savage), Arcadion, patch 7.4; final boss only.
// Research checked 2026-10-08. Comments only; no detector registered.
// No report analyzed: ALL proposed log signals are guide-inferred.
// lindwurm-1.ts owns the door boss and successful transition into this
// checkpoint. A P2 wipe restarts P2; its clock below starts at P2 engage.
// Selected: Modified 3VJ0, DN Rep1, BC Rep2, DN Uptime Idyllic. The user's
// supplied Static Staging Rep2 is also a valid profile, documented below.
//
// -- SOURCES AND CONFIDENCE --
// [W] Strategy board, Rep2 assignment selectors and Idyllic diagrams:
//     https://wtfdig.info/74/m12s#modified:::bc:dnuptime
//     Modified text linked there (text fetch unavailable):
//     https://pastebin.com/qXLm3VJ0
// [DN1] Original DN Rep1, diagrams inspected:
//       https://raidplan.io/plan/9ncP6UIDURcWuRuO
// [BC] Original BC Rep2, map inspected; 2026-02-17 edit changes stacks:
//      https://raidplan.io/plan/jaakesbessc2uv7h
// [SS] User-supplied Static Staging, all 20 slides inspected:
//      https://raidplan.io/plan/kz2hgf4parq3fbf3
// [DU] DN Uptime Idyllic, diagram sequence and notes inspected:
//      https://raidplan.io/plan/PdUdKJ3dCYzmc-p8
// [DO] Original DN Idyllic, linked by W; differs from DU's live defams:
//      https://raidplan.io/plan/zoeminUT6l2gaOWp
// [SC] Blood Mana/Superchain plan linked by W:
//      https://raidplan.io/plan/OnhUS061LkI3xlmg
// Kitten ERP's authored explanations; JP priorities differ from DN/BC:
// [K0] https://kitten-erp-guides.moe/savage/m12s_p2
// [K1] https://kitten-erp-guides.moe/savage/m12s/replication_1
// [K2] https://kitten-erp-guides.moe/savage/m12s/replication_2
// [KB] https://kitten-erp-guides.moe/savage/m12s/blood_mana
// [KI] https://kitten-erp-guides.moe/savage/m12s/idyllic_dream
// [IV] Lyra's original final-boss guide, January 2026, 7.45 update March:
//      https://www.icy-veins.com/ffxiv/aac-heavyweight-m4-final-boss-savage-raid-guide
// [TL] A'rhaeda Vhil, updated 2026-04-25; provisional hit/apply clock:
//      https://thaliak.com/raids/m12s2/
// [ID] Original Splatoon presets and Rep2 script; game IDs, not log proof:
//      https://github.com/PunishXIV/Splatoon/blob/main/Presets/Dawntrail/Raids/The%20Arcadion%2012%20Savage%20Phase%202.md
//      https://raw.githubusercontent.com/PunishXIV/Splatoon/refs/heads/main/SplatoonScripts/Duties/Dawntrail/M12S%20P2%20Clones%202.cs
// No mechanic-changing hotfix confirmed here. Guide damage/target counts
// and patch-dependent behavior remain unverified against current reports.
//
// -- ATTRIBUTION, STATUS NAMES AND CANDIDATE IDS --
// Attributable Damage Down is Major even survived. Other avoidable damage
// is Minor until it causes death/loss. Major names a proven root-cause
// player; Raid marks an inevitable wipe and can be player-less. A clipped
// victim or missing helper after an earlier death is not a fresh offender.
// Below, "escalates" means death, Damage Down or demonstrated pull loss.
// LOG SIGNALS are hypotheses, including penalties, not observed findings.
// Generic debuffs: Fire/Dark/Light Resistance Down II, Magic Vulnerability
// Up, Damage Down, Sustained Damage, Bind, Doom. Mechanic debuffs:
// Mutating Cells Alpha/Beta, Hotblooded, Nearby/Faraway Portent,
// Lindwurm's Portent. Localized labels/symbols may differ in FFLogs.
// [ID] Player status candidates: Dark Resistance Down II 3323; Faraway
// Portent 4766; Nearby Portent 4767; Hotblooded 4768. FFLogs may expose
// 100xxxx equivalents; those mappings are NOT established here.
// Action-effect candidate 46333 anchors Blood Mana; cast candidate 46383
// selects Far Netherwrath in the script. These are not proven damage IDs.
// Script cast 46307 and action effects 46311/46315/46384 are Rep2 phase
// anchors with unresolved FFLogs/name mappings, not assigned penalty IDs.
// Lindschrat clones are separate caster instances. Player mannequins are
// recordings of players, not those players themselves or killable adds.
// Recorded attack ownership, tether identity, facing, shapes and portal
// previews may be visual-only. Victim x/y does not identify the controller.
//
// -- SHAPE, REFERENCE CLOCK AND ROLE CONVENTIONS --
// Timed sequence: Rep1 -> Rep2 -> Blood Mana -> Idyllic -> escalating
// Arcadian Hell. No established player-driven energy/resource mechanic.
// Circle arena, then alternating full arena / two isolated platforms.
// Floor changes and knockbacks can cause falls with no killing ability.
// [TL] Approximate mm:ss from P2 engage, mostly damage/aura application;
// cast starts precede these. No exact timing tolerance established:
//   00:15 Arcadia Aflame; 00:28 Rep1; 00:39-40 first fire/dark/cones;
//   00:45 Snaking Kick; 01:01-02 second fire/dark/cones; 01:09-17 Sobat.
//   01:31 Staging; 01:45 Rep2; 02:08 Firefall/proteans; 02:10 defams;
//   02:15 stacks; 02:17 cones; 02:21 Kick; 02:31 Reenactment;
//   02:39 Near/Far + N/S replay; 02:43 NE/SW; 02:47 E/W; 02:51 SE/NW.
//   03:04 Mutating Cells; 03:10 Blood Mana; 03:21 contacts; 03:22 flip;
//   03:37 Blood Wakening; 03:39/44 hazards; 03:48 Netherworld;
//   03:52 second mutation flip; 03:56 Aflame; 04:06-13 Sobat.
//   04:29 Idyllic Dream; 04:36 Staging; 04:51 blue; 04:57 Rep3;
//   05:09 green; 05:15 Rep4; 05:35 blue; 05:39-40 stored chariot/cones;
//   05:43 Meteor; 05:50 Downfall; 05:57 Arcanum; 06:04 green;
//   06:12-25 four live stack/defam sets; 06:34 blue; 06:39 towers;
//   06:44 earth; 06:49 portents; 06:58 Temporal Curtain;
//   07:10 green; 07:17 Reenactment; 07:20 first replay;
//   07:26 blue; 07:30 stored attacks; 07:33 green;
//   07:41 second replay; 07:46 portal cones; 07:52 Dream closes.
//   08:00-08 Sobat; 08:21 Rep5; 08:35/08:51/09:14 Arcadian Hell.
// True compass directions below refer to arena north, not boss facing.
// MT/OT tanks; H1/H2 healers; M1/M2 melee; R1/R2 ranged. G1 contains
// MT/H1/M1/R1; G2 OT/H2/M2/R2 unless a block explicitly regroups them.
// H1/H2 and R1/R2 assignment still depends on the static's roster/config.
//
// -- RAIDWIDES, DOUBLE SOBAT AND SNAKING KICK [IV, K0] --
// What happens: Arcadia Aflame, both Idyllic Dream bookends and platform
// Meteor damage are unavoidable. Double Sobat initially shares a physical
// tank hit, then a facing half-room cleave, then Esoteric Finisher magic
// AoEs on the two top-enmity players. Snaking Kick is a separate avoidable
// half-room attack between replication events.
// Correct play: share/mitigate first Sobat or solo it with invulnerability;
// avoid the turning cleave; separate both Finisher targets. Initial invuln
// does not guarantee protection from the later magic hits. Dodge Kick.
// Failure: turning cleave/Kick clip -> LOG SIGNAL: avoidable damage plus
//   Damage Down/death; FAULT: mover if safe-side evidence exists;
//   CONSEQUENCE: Major on Damage Down/death, otherwise Minor.
// Failure: Finisher overlap/stray enmity -> LOG SIGNAL: extra recipients
//   or non-tank target; FAULT: displaced tank or failed enmity controller
//   only if established; CONSEQUENCE: Minor, escalates.
// Not errors: shared first hit, tank invuln solo, two separated Finishers,
// unavoidable raid damage. Raidwide deaths alone do not assign heal blame.
//
// -- REPLICATION 1: DN ELEMENT ROTATION [K1, DN1] --
// What happens: four cardinal clones, one fire two-player Top-tier Slam,
// opposite dark Mighty Magic near-player AoEs, and two cone clones. After
// Kick there are eight clones: two fire, two dark and four cones. Fire and
// dark hits leave resistance debuffs, prohibiting repeating that element.
// DN's initial grouping produces four dark-hit players, two fire-hit and
// two unhit; an unhit player is valid. Damage-recipient vs target counts
// matter: a targeted dark AoE can also hit its paired player.
// Correct play, initial DN pair positions: MT+M1 NE, OT+M2 SW,
// H1+R1 NW, H2+R2 SE, adjusting to the actual fire/dark direction. Avoid
// cone lanes; do not overlap separate dark baits. Then dark players pair
// for fire; fire/unhit players take separate dark hits. Dodge Kick first.
// DN inner-clone assignments (tanks/melee): dark pair uses inner fire
// from center. For dark solo baits, tanks scan clockwise from true N,
// melees counterclockwise from NW, selecting the inner dark-adjacent
// numeric marker; stand on its inner edge away from the clone.
// DN outer-clone assignments (healers/ranged): dark pair selects outer
// fire via clockwise letter-marker scan from N. For solo dark, healers
// scan clockwise from N, ranged counterclockwise from NW to the adjacent
// letter. Stack centered on that marker, adjusting away from cone lanes.
// Failure: repeats element -> LOG SIGNAL: fire/dark hit while matching
//   Resistance Down II is active; FAULT: player in the wrong element spot,
//   unless another bait clipped them; CONSEQUENCE: Major if lethal.
// Failure: wrong fire share/dark overlap/cone -> LOG SIGNAL: lethal small
//   Top-tier Slam group, extra Mighty Magic/Scalding Waves hits or penalty;
//   FAULT: misplaced bait/helper if proven; CONSEQUENCE: Minor, escalates.
// Removal: elemental resistance normally expires; death removal is not
// proof of a completed elemental rotation. Death-time retargets unknown.
// Not errors: planned paired dark recipients, unhit first-wave players,
// fire stacks and later opposite-element hits. Garou/static-priority or
// JP priorities can solve the same mechanic with different positions.
//
// -- REPLICATION 2: SHARED RECORDING RULES [K2, IV] --
// What happens: Staging creates eight player mannequins, one linked to
// each player; spawn pairs N/S -> NE/SW -> E/W -> SE/NW. This identity
// link is not passable. Replication creates six boss clones: two stacks,
// two cones, two defams, plus a boss-jump tether. These seven attack
// tethers CAN be passed; the eighth player intentionally has none.
// Firefall Splash jumps to its bait and binds it; four Scalding Waves
// proteans accompany it. Two chosen Mana Burst defams plus a third on
// the farthest player precede two Heavy Slam stacks, then two facing-based
// Hemorrhagic Projection cones. The locked assignment is recorded onto
// the player's mannequin. Live movement does not relocate that recording.
// Correct play: jump bait on agreed north side, defams west/east and
// no-tether player far south; cone/stack players bait the initial proteans
// without doubling, then share stacks. Live cone holders stand inside the
// boss ring facing the boss, aiming away from the party. Replay clone
// cones point toward arena center. Kick follows. Reenactment replays four
// mannequin pairs in spawn order.
// Near/Far Netherwrath coincides with first replay: two nearest/farthest
// baits take Timeless Spite stacks. Partners or tank solo mitigation valid.
// Failure: wrong recording -> LOG SIGNAL: later clone attacks inconsistent
//   with configured identity map, then overlap/miss; FAULT: player who
//   locked wrong attack only if ownership is established; CONSEQUENCE:
//   Minor, escalates; Raid if no surviving solution. Map mismatch alone
//   is not proof of a failed mechanic or which strategy was intended.
// Failure: live defam/protean/cone overlap -> LOG SIGNAL: extra Mana Burst,
//   Scalding Waves/Hemorrhagic Projection recipients, penalty/death;
//   FAULT: misplaced carrier/aimer, not each victim; CONSEQUENCE: escalates.
// Failure: clone stack unsoaked -> LOG SIGNAL: Heavy Slam (Clone) miss and
//   raid Sustained Damage; FAULT: assigned living helpers if known;
//   CONSEQUENCE: Raid for unrecoverable bleed. Small mitigated stacks valid.
// Failure: bad Near/Far bait -> LOG SIGNAL: Timeless Spite on unexpected
//   recipients/overlap; FAULT: distance controller with evidence;
//   CONSEQUENCE: Minor, escalates. Tank solo is not a missing-helper error.
// Removal/lifecycle: recording persists on clones after the original
// player's movement; replay consumes it. Tether transfer/lock, owner death
// and clone despawn are not verified aura-removal signatures.
// Not errors: correct initial damage/Bind, no-tether defam, recordings,
// split replay stacks and Near/Far hits. Defam knockback can cause falls.
//
// -- REP2 PROFILE A: BC, D AS RELATIVE NORTH [BC, W] --
// This is the requested public strategy, with true-west D used as north.
// Player-clone position -> recorded attack (both compass systems shown):
//   relative N  = true W / D     -> boss tether
//   relative S  = true E / B     -> no tether / far defam
//   relative NW = true SW / 3    -> stack
//   relative NE = true NW / 4    -> stack
//   relative W  = true S / C     -> cone
//   relative E  = true N / A     -> cone
//   relative SW = true SE / 2    -> defam
//   relative SE = true NE / 1    -> defam
// Duplicate-type choice on W: purple/red scan clockwise from D;
// blue/yellow counterclockwise. These colors represent linked clone spots,
// not raid jobs. Initial jump at D; relative W/E defams, relative S far bait;
// stack/cone holders bait proteans near relative N, then stacks at 3/4.
// BC's pictured Kick safe location is A. For replay, stack/cone holders
// handle Near/Far together; the other four soak 3 then 4. Stack/cone
// holders subsequently handle jump-replay proteans near relative north.
// True N/S clone cones occur first; NE/SW stacks second; E/W jump/far
// defam third; SE/NW defams last. This order follows the table above.
// Different job combinations owning those attacks are normal.
//
// -- REP2 PROFILE B: STATIC STAGING [SS] --
// All directions TRUE north. Clone position -> recorded attack:
//   N stack; NE stack; E cone; SE defam;
//   S no tether/far defam; SW defam; W cone; NW boss tether.
// Duplicate priority: N/NW/W/SW group scans counterclockwise from N;
// NE/E/SE/S group clockwise from NE. Initial boss jump at A/north,
// chosen defams W/E, untethered far south. Initial stacks use temporary
// tether groups, discarded before replay.
// Replay groups: H1+M1+M2 take N stack; H2+R1+R2 take NE stack. Tanks
// solo Near/Far with mitigation. Near: tanks closest, melee outside ring.
// Far: tanks W/NW far, ranged step in; melee may enter ring.
//   Wave 1 N/S: three-player N stack + S defam + tank Near/Far.
//   Wave 2 NE/SW: three-player NE stack + SW defam.
//   Wave 3 E/W: cones; ranged adjust NW for the coming SE defam.
//   Wave 4 SE/NW: SE defam + NW jump/proteans; avoid landing point,
//     spread without double proteans. North wall is the pictured safe area.
// Tanks may move the boss NW after Near/Far for melee positionals.
// Interpretation: this is not BC merely rotated. NW jump moves replay to
// wave 4, while N and NE stacks occupy waves 1/2. Three-player stacks and
// two solo tank baits are intentional costs; surviving those is correct.
// A BC-only assignment rule would falsely accuse these valid SS players.
//
// -- BLOOD MANA: MUTATION AND SHAPE CONTACTS [KB, W] --
// What happens: four Mutating Cells Alpha must avoid damage; four Beta
// must receive damage before expiry, one tank/healer/two DPS in each set.
// Damage flips the statuses. Blood Mana sends four shapes from each E/W
// hole: green ring Aero III donut, cyan orb Water III circle, red bowtie
// Sideways Fire II E-W cone, purple bowtie Straightforward Thunder III
// N-S cone. Contact causes Bloody Burst and stalls that shape. Blood
// Wakening resolves the delayed hazards in two sets ~5s apart.
// Correct play: Beta tank takes enmity; Alpha avoids even autos. On the
// side with two closely paired shapes, identify their types; contact the
// matching two on the opposite side. Beta tank takes north contact solo
// mitigated, other three Beta take south together. Alpha avoids both.
// After the flip, swap tank enmity. Purple/cyan contacts: start on contact
// side in N/S donut safe spots. Red/green contacts: start opposite. Cross
// for second hazard set. Final Near/Far Netherworld Wailing Wave must hit
// all four current Beta, with current Alpha outside; then statuses flip.
// Failure: Alpha hit/Beta unhit -> LOG SIGNAL: wrong mutation transition
//   or retained status at expiry plus Dramatic Lysis/Damage Down;
//   FAULT: holder for avoidable contact, tank controller for a proven
//   failed enmity swap; CONSEQUENCE: Major on Damage Down/death.
// Failure: wrong shape contacted -> LOG SIGNAL: wrong stalled caster or
//   altered hazard sequence plus unsafe overlaps; FAULT: contact player
//   only if object/contact identity exists; CONSEQUENCE: Minor, escalates;
//   Raid if hazards have no remaining solution.
// Failure: hazard or wrong Netherworld bait -> LOG SIGNAL: unintended
//   Aero/Water/Fire/Thunder III or Wailing Wave recipients; FAULT: mover
//   or distance controller if proven; CONSEQUENCE: Minor, escalates.
// Removal: intended damage replaces Alpha/Beta with opposite status;
// ordinary failed expiry produces penalty. Death removal is unresolved.
// Not errors: intended Bloody Burst, Beta tank autos, correct Wailing Wave.
// Four-plus-four delayed contact and other shape priorities are alternatives;
// retained visual shapes alone do not prove a failed selected strategy.
//
// -- IDYLLIC DREAM: TWO REALITIES AND RECORDING [KI, K0] --
// What happens: Twisted Vision alternates green full arena and blue
// platforms. Inactive reality's casts pause, then resolve when restored;
// paused Downfall/chariot/cones are not interrupted or missed mechanics.
// Staging makes four cardinal then four intercardinal mannequins, or the
// reverse. Rep3 stores two facing cones plus a central chariot. Rep4 offers
// eight alternating stack/defam tethers for four live attack sets; the boss
// clone at true north determines stack-first vs defam-first. Mannequin
// spawn formation instead determines which recorded set replays first.
// Correct recording, DN: player clones N/NE/E/SE choose stack; S/SW/W/NW
// choose defam, four each. Swap boss-clone tethers within quadrant pairs,
// each pair having one stack/one defam. Remember Rep3 safe N/S and E/W
// lane; dodge it on return to blue before Meteor separates the platforms.
// Failure: bad memory/tether assignment -> LOG SIGNAL: avoidable stored
//   cone/chariot hits or later missing stacks/defam overlaps; FAULT: owner
//   only with identity evidence, otherwise unknown; CONSEQUENCE: escalates.
// Lifecycle: paused casts persist across reality changes. Replays occur
// from clone spots, not their owners' current spots. Owner-death effects
// and whether recorded attacks still replay after death remain unverified.
// Not errors: delayed cast completion, cross-reality downtime and damage
// from intended live/clone stacks. Other tether maps can solve the mechanic.
//
// -- IDYLLIC: DOWNFALL TOWERS, ARCANUM AND PORTENTS [KI, IV] --
// What happens: eight Downfall towers, four per platform; earth/fire/wind/
// dark types each appear once per island. Towers pause. Arcanum puts four
// light spreads on one role, applying Light Resistance Down II. Light
// holders exchange wind/dark assignments with unmarked close/far partners.
// Return to blue resolves Cosmic Kiss towers, then earth's Stone III,
// then Nearby/Faraway Portent Thunder II cones and Lindwurm's Portent Glare.
// Correct play: true G1 west/G2 east. Facing boss, supports left / DPS
// right; tanks/melee close, healers/ranged far. Remember swapped towers.
// Earth: vacate delayed circle. Fire: Hotblooded, stay still ~5s; casting
// without movement is valid. Wind: knockback crosses to other island.
// Dark: aim tower-center -> soaker line outward, then cleanse Doom with
// Esuna/Warden's Paean. This line is position-controlled, not facing.
// Wind grants Faraway Portent; dark Nearby Portent. DN cone baits: wind
// at boss ring E/W, dark at north platform edge within ring; fire/earth
// melee between them, fire/earth ranged at south edge. Nearest/farthest
// players control cones from portent holders; Glare is expected damage.
// Failure: wrong tower under Light vuln -> LOG SIGNAL: repeated light
//   damage under Light Resistance Down II; FAULT: wrong holder unless an
//   earlier spread clip supplied the vuln; CONSEQUENCE: Major if lethal.
// Failure: missed tower -> LOG SIGNAL: absent Cosmic Kiss soak plus raid
//   Sustained Damage; FAULT: assigned living soaker if known;
//   CONSEQUENCE: Raid if unresolvable. Penalty IDs not yet established.
// Failure: uncleansed Doom -> LOG SIGNAL: Doom expires into death;
//   FAULT: assigned cleanser only if target/available window are proven,
//   otherwise unknown; CONSEQUENCE: Major if attributable, Raid if lost.
// Failure: moves under Hotblooded/earth hit/fall -> LOG SIGNAL: associated
//   damage, Damage Down/death or no-killing-blow fall; FAULT: mover if
//   evidence establishes it; CONSEQUENCE: Minor, escalates.
// Failure: dark line/portent clips -> LOG SIGNAL: extra line/Thunder II
//   hits; FAULT: tower soaker/distance bait only with geometry evidence,
//   otherwise unknown; CONSEQUENCE: Minor, escalates.
// Removal: Doom requires cleanse; Hotblooded/portents normally expire
// after their resolution. Death removal is not proof of correct execution.
// Not errors: eight tower hits, four Arcanum spreads, wind crossing,
// Doom application followed by cleanse, correct cone/Glare damage.
// Stone III is a delayed earth AoE, not a literal movement-spawned Twister.
//
// -- IDYLLIC: DN UPTIME LIVE SETS AND FINAL REPLAYS [DU, W] --
// DU temporarily regroups by clone spot, not true G1/G2: N/NE/S/SW east;
// E/SE/W/NW west. Across four live sets, two defams alternate with two
// stacks; either type can go first. First defams S/W owners, second SW/NW;
// E group's defam is NE, W group's NW. Others wait south, then share
// stacks at east 2 / west 4, with N/NE stack owners east and E/SE west.
// This differs from original DN's southward defam placement. Numeric
// marker geometry in DU diagrams and W governs; DU's text macro differs.
// Temporal Curtain stores a portal for one N/S cone clone, another cone
// on one platform and chariot on the other. Remember portal orientation
// and which platform has cones. In green, recorded cardinal/intercardinal
// formation 1 replays two stacks/two defams. DN uses six non-tanks on
// N/A stack, two mitigated tanks on E/B; intercardinals NE and SE, with
// tank stack adjusted toward B. In blue, both groups use cone platform
// and dodge facing; green resumes formation 2, then portal clone emerges
// north for final cones. Closing Dream raidwide ends this sequence.
// Failure: live defam/stack overlap -> LOG SIGNAL: extra Mana Burst or
//   lethal Heavy Slam share; FAULT: misplaced assigned player if known;
//   CONSEQUENCE: Minor, escalates.
// Failure: missed replay stack -> LOG SIGNAL: Heavy Slam (Clone) penalty/
//   Sustained Damage; FAULT: living assigned helper if established;
//   CONSEQUENCE: Raid if terminal. Two-tank mitigation is intentional.
// Failure: wrong platform/portal lane -> LOG SIGNAL: chariot/portal cone
//   damage or platform fall; FAULT: mover if preview/geometry established;
//   CONSEQUENCE: Minor, escalates; unknown visual callout stays player-less.
// Not errors: changing temporary groups, intended four-player live stacks,
// six-plus-two clone stacks, and shared closing raidwide. "Better DN" is
// a separately listed variant; it was not selected instead of DN Uptime.
//
// -- ARCADIAN HELL AND PULL END [TL, K0] --
// Final replication gives four boss clones, then eight, then sixteen.
// Arcadian Hell damage lands from boss plus clones: 5, 9, then 17 caster
// instances around 08:35, 08:51, 09:14. First two are intended mitigation
// checks; final volley is hard enrage. These are caster counts, not proof
// that a particular FFLogs representation has that many damage rows.
// Failure: enrage -> LOG SIGNAL: final lethal Arcadian Hell volley;
//   FAULT: party damage check, no invented individual; CONSEQUENCE: Raid.
// Other terminal failures: mandatory clone-stack/tower Sustained Damage,
// defam/cone multi-kills, impossible mutations, or platform losses leaving
// no stack solution. Cutoff belongs to first irreversible failure; later
// repeated deaths and unsoaked attacks are downstream fallout.
//
// -- OPEN QUESTIONS FOR LOG VERIFICATION --
// 1. What are exact P2 encounter/reset anchors and every cast/damage/aura
//    ID? Confirm game-status vs FFLogs IDs, clone NPC/caster instances and
//    separate IDs for live vs clone Heavy Slam, Mana Burst and proteans.
// 2. Are Staging player identities, passable tether transfers/lock and
//    recorded attack types captured? Can BC/SS be recovered from successful
//    recordings, or must the chosen Rep2 profile be supplied per pull?
//    Failed positioning alone cannot establish the intended profile.
// 3. BC vs SS share underlying penalties but different owners, replay
//    order and stack sizes. Which successful three-person SS and two-tank
//    DN stacks establish valid mitigation ranges? Is any small stack a
//    categorical penalty or simply larger split damage?
// 4. Replay proteans: TL says original targets, SS accepts any non-doubled
//    recipients. Are targets preserved, reselected by distance, or another
//    rule? What logs distinguish clone owner from protean bait controller?
// 5. Confirm Rep1 dark target/recipient counts and cone spell names, precise
//    DN marker scan tie-breaks, element durations and death-driven retargets.
// 6. KB/W/IV say Alpha avoids and Beta soaks; TL reverses labels in one
//    paragraph. Which status IDs flip on Bloody Burst/Wailing Wave, and
//    what distinct Dramatic Lysis penalty proves failed mutation expiry?
// 7. Which avoidable attacks apply Damage Down? What are missed tower/clone
//    stack Sustained Damage IDs, Doom expiry, Hotblooded ticks and fall
//    signatures? What death/dispel removals launch recorded attacks?
// 8. Are shape/portal/cone previews observable, and what radii, facing
//    vectors and snapshot times make fault attribution reliable? Can a
//    wrong shape contact make hazards unsolvable before the first death?
// 9. Verify DU's diagram vs macro marker geometry, live stack-first vs
//    defam-first timing, paused-cast logging, light/tower swaps and clone
//    replay formation order. Preserve valid original DN/JP alternatives.
// 10. What evidence distinguishes cleanse omission from an unavailable
//     target/cleanser, and does a player dying leave their recorded clone
//     active? Confirm final enrage time and simultaneous-caster grouping.
