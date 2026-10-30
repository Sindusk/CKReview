// lib/mechanics/ffxiv/arcadion/lindwurm-2.ts
//
// Lindwurm II (M12S P2) per-pull rules. Entry point: detectLindwurm2Errors.
// FFLogs logs P2 as its own fight ("Lindwurm II"); the module self-gates on
// P2's signature casts, so lindwurm-1.ts's door boss is skipped.
//
// ── DIGEST (read first; detail in the sections it names) ──
// What: all of P2 (~9:05 kill): Replication 1/2/3, Blood Mana, Idyllic
//   Dream, Arcadian Hell. Gate: P2 signature casts (Arcadia Aflame etc.).
//   The static's plan varies pull to pull, so rules judge outcomes, never
//   BC/SS/DN spots or assignments. Slots: roles.ts as-is.
// Rules (Major on Damage Down or death unless noted):
//   ffxiv-lw2-avoidable (Minor otherwise): plain avoidable hits.
//   -element: Rep1 hit of an element whose Resistance Down is held; names
//     the repeater (second-set fire/dark variants name the missed bait).
//   -contact (Major): broken Blood Wakening wave names the Bloody Burst
//     contact. -cone: live Hemorrhagic Projection names the Grotesquerie
//     holder on its cast, else player-less.
//   -overlap / -defam: one-bait-per-player families (PERSONAL: Mighty
//     Magic, Scalding Waves, Firefall Splash, Mana Burst, Arcanum, portent
//     cones, tank Finishers). -finisher: non-tank in a tank's Finisher.
//   -stack: player in both Heavy Slam stacks, or the ones who missed a
//     stack that killed; Unmitigated Impact player-less Minor.
//   -mutation (Major): failed Mutation check (Unmitigated Explosion).
//   -tower: empty Cosmic Kiss towers. -doom (Minor, player-less): Doom ran
//     out. -fall: knocked off by wind tower (Major) else Minor.
// Cutoffs (Raid): -mass-death (4+ deaths to one mechanic in 3s, pull over
//   within 60s), -enrage (Arcadian Hell final volley), -called-wipe,
//   -collapse; each only before any other Raid. -reset (Raid, player-less):
//   death before first Arcadia Aflame = tactical reset after a Lindwurm
//   kill. Both healers dead is a cutoff via ffxiv/common.ts.
// Thresholds: Rep1 repeat hit while holding that Resistance Down killed
//   69 of 71 (reports A, B); CONE_OWNER_MAX for cone holder; Blood Mana
//   check at 3:23 and 3:53, every beta needs a hit, every alpha none (17
//   fails in the sample); Doom 8s; mass-death 4+ in 3s.
// Exposure (rule-meta.ts): -finisher non-tanks, -contact solo contact,
//   rest everyone. Damage Down causes excluded from ffxiv-damage-down.
// Sections: "VERIFIED AGAINST LOGS (2026-10-12)" (5 reports, kill clock,
//   log IDs, failure findings); "RULES IMPLEMENTED" (full rule text, VOD
//   rulings, not built); "GUIDE-DERIVED MODEL: LINDWURM II (M12S P2)";
//   "SOURCES AND CONFIDENCE"; "ATTRIBUTION, STATUS NAMES AND CANDIDATE
//   IDS"; "SHAPE, REFERENCE CLOCK AND ROLE CONVENTIONS"; "RAIDWIDES,
//   DOUBLE SOBAT AND SNAKING KICK"; "REPLICATION 1: DN ELEMENT ROTATION";
//   "REPLICATION 2: SHARED RECORDING RULES"; "REP2 PROFILE A: BC, D AS
//   RELATIVE NORTH"; "REP2 PROFILE B: STATIC STAGING"; "BLOOD MANA:
//   MUTATION AND SHAPE CONTACTS"; "IDYLLIC DREAM: TWO REALITIES AND
//   RECORDING"; "IDYLLIC: DOWNFALL TOWERS, ARCANUM AND PORTENTS"; "IDYLLIC:
//   DN UPTIME LIVE SETS AND FINAL REPLAYS"; "ARCADIAN HELL AND PULL END";
//   "OPEN QUESTIONS FOR LOG VERIFICATION".
// Open/not built: strategy assignment checks; Timeless Spite baits;
//   Top-Tier Slam stack sizes; Bloody Burst / Wailing Wave survival; Dark
//   II tower lines; which shape was contacted; tank buster deaths.
//   Unruled VOD cases are listed in RULES IMPLEMENTED.
// ── END DIGEST ──
//
// -- VERIFIED AGAINST LOGS (2026-10-12) --
// Progression of the user's static, plan varying pull to pull (user: "ours,
// plan varies"), so rules judge outcomes, never the BC/SS/DN spots below.
// 95 pulls, cited as E13 7:47 (report letter, pull, mm:ss from P2 engage):
//   A = AYQm9Kd8Ct4FxcGp (19 wipes, all in Replication 1, furthest 1:29),
//   B = H9fnVZgPA3krpCzY (29 wipes, furthest 3:44),
//   C = 13wYrRKFLjWZzqJk (15 wipes, furthest 6:20),
//   D = vFY7kHVWK19ZQ24A (19 wipes, furthest 7:01),
//   E = zWVayP4BM9dk8tA1 (12 wipes, kill E13, 9:07).
// B's "Lindwurm" pull 4 (a P1 checkpoint stub) waits into P2 (Arcadia Aflame
// at +1:37) after the party jumped: only the called wipe fires there. E1 is a
// 0:25 reset (jumps at 0:02-0:10).
// Slots: roles.ts as-is (user, lindwurm-1.ts); no rule here needs them.
//
// Clock (the kill; every pull within ~1s): Arcadia Aflame 0:16, Replication
// 0:28, Rep1 sets 0:40 and 1:02, Snaking Kick 0:46, Double Sobat 1:10 (turn
// cleave 1:15), Esoteric Finisher 1:18, Staging 1:32, Replication 1:46,
// Firefall Splash + proteans 2:09, Mana Burst 2:10, Heavy Slam 2:16, cones
// 2:18, Snaking Kick 2:22, Reenactment 2:32, replays 2:40-2:54 (Near/Far,
// Timeless Spite 2:41), Mutating Cells 3:04, Blood Mana 3:11, first check
// 3:23, Blood Wakening 3:38 (shapes 3:40 / 3:45), Wailing Wave 3:51, second
// check 3:53, Arcadia Aflame 3:57, Double Sobat 4:07, Finisher 4:14, Idyllic
// Dream 4:30, Rep3 replays 5:11 / 5:40, Meteor 5:45, Arcanum 5:58, live sets
// 6:12 / 6:17 / 6:22 / 6:28, towers 6:40, Stone III 6:45, portents 6:51,
// Temporal Curtain 6:59, replays 7:20-7:47, Idyllic Dream 7:53, Double Sobat
// 8:01, Replication 8:22, Arcadian Hell 8:35 / 8:52, enrage 9:05 (48833 /
// 46391, unfinished in the kill).
//
// Log IDs:
// - Damage Down causes (every one, all reports): Snaking Kick 46375 / 48789
//   (Rep3 replay), Winged Scourge 46300, Double Sobat 46373 (the turn; the
//   first hit is 46369-46372), Firefall Splash 46317 (replayed jump),
//   Hemorrhagic Projection 46315 (live) / 47394 (replay), Blood Wakening's
//   Water III 46337 / Aero III 46338 / Straightforward Thunder II 46339 /
//   Sideways Fire II 46340, Unmitigated Explosion 46344 (failed mutation),
//   Power Gusher 46358, Lindwurm's Stone III 46327. Pyretic Wurm 46329 (moved
//   under Hot-Blooded 1004768) only ever killed.
// - Rep1: fire Top-Tier Slam 46302 (two-player stack per clone), dark Mighty
//   Magic 46304 (first set: two untargeted instances on pairs; second set:
//   four cast-targeted), Fire / Dark Resistance Down II 1002937 / 1003323.
//   Kill: 2 fire + 4 dark in set 1, 4 fire (2 clones) + 4 dark in set 2.
// - Rep2 live: Firefall Splash 46308 (jump, one player), Scalding Waves 46309
//   (four proteans, cast-targeted), Mana Burst 46311 (three defams, NO cast
//   target; the cast sits on the clone, not the owner), Heavy Slam 46312
//   (two stacks, 4 + 4 in every clean pull), Grotesquerie 46314 cast-targeted
//   at the two cone holders, Hemorrhagic Projection 46315 (cones: hit nobody
//   in every clean pull; the cast sits on its holder, 0.0-0.1y in E13, and
//   its cast target is the VICTIM). Unmitigated Impact 46320: a clone stack
//   nobody took (B16 2:20, both stacks empty).
// - Replays: Netherwrath Near / Far 46382 / 46383 -> Timeless Spite 46384
//   (two targets; tanks solo it in the kill), Mana Burst 48099, Heavy Slam
//   48733 (three-player stacks in Rep2, all eight at Idyllic's end),
//   Scalding Waves 47329.
// - Blood Mana: Mutating Cells hands Mutation alpha 1004769 / beta 1004771 to
//   four each. At each check (3:23, 3:53) every beta must have taken a hit
//   (Bloody Burst 46334 at the contact, then Wailing Wave 46381) and every
//   alpha none: ANY hit counts (C12 3:53 an alpha in Wailing Wave, E11 3:54
//   an alpha in Sideways Fire II). The statuses swap on a timer, not on the
//   hit. Pass = Dramatic Lysis 46343 for 0; fail = Unmitigated Explosion
//   46344 with Damage Down on that player (17 in the sample).
// - Idyllic: Lindwurm's Meteor 46322 and Idyllic Dream 46345 are raidwides.
//   Arcadian Arcanum 47577 (four cast-targeted light spreads). Cosmic Kiss
//   46324 towers are cast-targeted at the soaker; an empty one explodes as
//   Unmitigated Explosion 46325 (one per empty tower) plus Sustained Damage
//   1004149. Lindwurm's Dark II 46326 hits 1-3 players (2 in the kill) and
//   gives Doom 1003364 (8s; Esuna clears it). Portents: Thunder II 46330 /
//   Glare 46328, cast-targeted, one player each in the kill. Live sets:
//   Heavy Slam 46361 (4 + 4) and Mana Burst 46360 (two cast-targeted defams).
// - Esoteric Finisher 46374: cast-targeted at the two tanks, 2 hits clean.
//
// Failure findings:
// - Rep1 (all of A, most of B's early pulls): a fire or dark hit while
//   already holding that element's Resistance Down killed 69 of 71 times.
// - Rep2 live defams: an unowned Mana Burst on 3+ players is the defam
//   landing in the group (C6, C7 2:11 hit 6); whose it was isn't in the log.
// - Mana Burst knocks back: no-killing-blow deaths 2.2-2.8s after a 46360
//   hit are players knocked off the platforms (D16 6:25, D18 6:21, E4 6:15).
// - Doom ran out uncleansed into a no-killing-blow death 2s later (E7 6:49,
//   E8 6:48).
// - Bloody Burst deaths (15) were betas taking their contact: survival.
// - The kill has two deaths to the last Power Gusher replay (E13 7:47).
// - Rep1's repeated hit re-applies its resistance ~0.5s before its damage as
//   a same-millisecond remove + apply (D3 1:03): a refresh, not a gap.
// - Rep1's second set hits everyone once. A fire taken alone that killed
//   means a partner took no element at all (D1, D12, D17 1:02). A tank
//   soloing a fire and living is a plan (13 times in B).
// - Blood Wakening waves are Water + Aero + 2 Fire + 2 Thunder in all 30
//   pulls but D7 (4 Fire, then 4 Thunder): the wrong shape contacted. The
//   solo contact's Bloody Burst is cast-targeted at that tank every pull.
// - Wind tower: Faraway Portent 1004766 marks its soaker; a knockback off
//   the island dies with no killing blow 4.4s later (D11, E7, E12 6:44).
// - Healer LB3 (Techne Makre 24859, Astral Stasis 4248, ...) is in the
//   caster's own casts; the Sage's next action came 8.7s later (D11 6:31).
// - Unexplained wipe: C15 (nobody died after 2:48; the pull reset at 4:48).
//
// Cutoffs (first Raid error): mass death 37, collapse 29, called wipe 23,
// towers 4, none 1 (C15); the kill has none. Collapse: 5 dead with the pull
// over within 45s (C8 went on 77s after 5 died to Idyllic Dream at 4:34).
//
// -- RULES IMPLEMENTED --
// ffxiv-lw2-avoidable (Major on Damage Down or death, else Minor): AVOIDABLE.
// ffxiv-lw2-element (Major if it killed): a Rep1 hit of the element whose
//   Resistance Down the player already held names them (and, in the
//   description, whose targeted dark it was). In the second set, a fire
//   taken alone that killed names the living players who took no element
//   (Major), not the lone taker. A second-set dark on a dark-hit player who
//   also took their fire had no bait: the fire-hit or unhit player who took
//   no dark is named ("Missed Their Dark Bait"), not the fire pair it fell
//   on (unless already named for that set).
// ffxiv-lw2-contact (Major): a broken Blood Wakening wave names the
//   cast-targeted Bloody Burst contact; that wave's shape hits on the others
//   aren't errors.
// ffxiv-lw2-cone: a live Hemorrhagic Projection that hit someone names the
//   Grotesquerie holder standing on its cast (CONE_OWNER_MAX), never a
//   victim; Major on Damage Down/death. No holder placed = player-less
//   (7 of 8 in the sample: the holders' positions are often stale).
// ffxiv-lw2-overlap / -defam (Major if anyone in it died): one-bait-per-
//   player families (PERSONAL): Mighty Magic (pairs allowed on untargeted
//   instances), Scalding Waves, Firefall Splash, Mana Burst (-defam; knock-
//   off deaths count; an unowned one on 3+ is player-less), Arcanum, portent
//   cones, and tanks overlapping their Esoteric Finishers.
// ffxiv-lw2-finisher: a non-tank in a tank's Esoteric Finisher with both
//   tanks holding enmity, named alone.
// ffxiv-lw2-stack: a player in both Heavy Slam stacks; a stack that killed
//   someone names living players in neither (not resolving their own bait or
//   locked in an LB3, more than 6y out), or, when one player took a stack
//   alone, that player instead ("took it away"); skipped with 3+ dead. Unmitigated Impact = player-
//   less Minor. Rep2's three-player replay stacks are not judged.
// ffxiv-lw2-mutation (Major: always Damage Down): Unmitigated Explosion 46344
//   names its player, saying whether they were a beta never hit or an alpha
//   hit (and by what).
// ffxiv-lw2-tower: empty Cosmic Kiss towers name the living non-soakers when
//   they match the empty count (1-2) and none was locked in their own healer
//   LB3, else player-less; Raid at 3+ deaths.
// ffxiv-lw2-doom (player-less Minor): Doom ran out; the cleanser isn't known.
// ffxiv-lw2-fall: knocked off by the wind tower (Major), else player-less
//   Minor: Walking Dead ran out, or an unexplained no-killing-blow death.
// ffxiv-lw2-mass-death (Raid): 4+ deaths to one non-raidwide mechanic within
//   3s with the pull over within 60s. -enrage (Arcadian Hell's final volley
//   killed), -called-wipe (as lindwurm-1.ts), -collapse: Raid, each only
//   before any other Raid.
// VOD review 2026-10-12 (user): report D pulls 1, 6, 7, 11, 19, rulings in
// expectations/rulings.json. Left unruled (the user couldn't tell): D4 6:05
// no-killing-blow, D6 6:18 and D8 6:17 defams, D12 2:09 proteans and jump,
// D13 2:19 (pull already over), D14 2:16 Rep2 stacks (tethers taken wrong).
// VOD review 2026-10-14 (user): report A pulls 12 and 16, plus the post-kill
// reset logged as "Lindwurm" Pull 33, rulings in expectations/rulings.json.
// Left unruled: A12's fire pair (correct or not is unknown), A14 1:02 (the
// ranged were wrong somehow; the camera didn't show how).
// ffxiv-lw2-reset (Raid, player-less): any death before the first Arcadia
//   Aflame is the tactical reset after a Lindwurm kill (pull Lindwurm II,
//   walk into the wall to get resources back); the pull gets nothing else.
//   B4, C2, A33 and the first Lindwurm II pull of two later reports.
// Both healers dead is a cutoff for every FFXIV fight (ffxiv/common.ts).
// Exposure (rule-meta.ts): -finisher targets the non-tanks, -contact the
// solo contact; the rest everyone. The Damage Down causes are excluded from ffxiv-damage-down
// (error-rules.ts).
//
// Not built: assignment checks for any strategy (the plan varied); Timeless
// Spite (Near/Far) baits; Top-Tier Slam stack sizes (the repeat rule covers
// its deaths); Bloody Burst / Wailing Wave survival; Dark II tower lines;
// which shape was contacted; tank deaths to their own busters (mitigation).
//
// -- GUIDE-DERIVED MODEL: LINDWURM II (M12S P2) --
// AAC Heavyweight M4 (Savage), Arcadion, patch 7.4; final boss only.
// Research checked 2026-10-08, before any report was analyzed: the log
// signals below are the researcher's hypotheses. VERIFIED AGAINST LOGS
// above wins every disagreement.
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

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import type { ReportedOccurrence } from "@/lib/mechanics/occurrences";
import { yd, kFmt, sec, joinNames, playerError, playerlessMinor, raidMarker, rezzedAt, clusterByGap, debuffIntervals } from "@/lib/mechanics/wow/common";
import { findPlayerPosition, interpolatePlayerPosition } from "@/lib/mechanics/player-position";

export const LW2_AVOIDABLE_RULE_ID   = "ffxiv-lw2-avoidable";
export const LW2_ELEMENT_RULE_ID     = "ffxiv-lw2-element";
export const LW2_CONE_RULE_ID        = "ffxiv-lw2-cone";
export const LW2_OVERLAP_RULE_ID     = "ffxiv-lw2-overlap";
export const LW2_DEFAM_RULE_ID       = "ffxiv-lw2-defam";
export const LW2_FINISHER_RULE_ID    = "ffxiv-lw2-finisher";
export const LW2_STACK_RULE_ID       = "ffxiv-lw2-stack";
export const LW2_MUTATION_RULE_ID    = "ffxiv-lw2-mutation";
export const LW2_CONTACT_RULE_ID     = "ffxiv-lw2-contact";    // the solo Blood Mana contact (a tank)
export const LW2_TOWER_RULE_ID       = "ffxiv-lw2-tower";
export const LW2_DOOM_RULE_ID        = "ffxiv-lw2-doom";
export const LW2_FALL_RULE_ID        = "ffxiv-lw2-fall";
export const LW2_MASS_DEATH_RULE_ID  = "ffxiv-lw2-mass-death";
export const LW2_ENRAGE_RULE_ID      = "ffxiv-lw2-enrage";
export const LW2_COLLAPSE_RULE_ID    = "ffxiv-lw2-collapse";
export const LW2_CALLED_WIPE_RULE_ID = "ffxiv-lw2-called-wipe";
export const LW2_RESET_RULE_ID       = "ffxiv-lw2-reset";
const ARCADIA_AFLAME = 46376; // P2's opening raidwide, ~0:16 after engage

// ── log IDs (see VERIFIED AGAINST LOGS) ─────────────────────────────────────

// Arcadia Aflame, Replication, Staging, Mutating Cells, Idyllic Dream: P2 only.
const SIGNATURE        = [46376, 46296, 46305, 46341, 46345];
const DAMAGE_DOWN      = 1002911;
const WALKING_DEAD     = 1000811; // Dark Knight's Living Dead follow-up
const WALKING_DEAD_FULL_MS = 9500;
const FIRE_RES_DOWN    = 1002937;
const DARK_RES_DOWN    = 1003323;
const TOP_TIER_SLAM    = 46302;   // Rep1 fire: a two-player stack from a clone
const MIGHTY_MAGIC     = 46304;   // Rep1 dark: the first set hits pairs, the second is cast-targeted
const GROTESQUERIE     = 46314;   // Rep2 live cones: cast-targeted at the cone holders
const HEMORRHAGIC      = 46315;   // Rep2 live cone (its cast target, when present, is the VICTIM)
const ESOTERIC_FINISHER = 46374;
const UNMITIGATED_IMPACT = 46320; // a clone stack nobody took
const MUTATION_A       = 1004769;
const MUTATION_B       = 1004771;
const BLOODY_BURST     = 46334;
const WAILING_WAVE     = 46381;
const MUTATION_FAILED  = 46344;   // Unmitigated Explosion on a player whose mutation failed
const COSMIC_KISS      = 46324;   // Idyllic towers: cast-targeted at the soaker
const TOWER_EMPTY      = 46325;   // Unmitigated Explosion: an Idyllic tower left empty
const SUSTAINED_DAMAGE = 1004149;
const DOOM             = 1003364; // from Lindwurm's Dark II (dark tower); Esuna clears it
const IDYLLIC_DREAM    = 46345;
const HEAVY_SLAM_LIVE  = 46312;   // Rep2 live stacks (two, shared by all eight)
const HEAVY_SLAM_IDYLLIC = 46361; // Idyllic live sets (two, shared by all eight)
const HEAVY_SLAM_REPLAY = 48733;  // replayed clone stacks
const MANA_BURST_KNOCK = [46311, 48099, 46360]; // defams that knock the people they hit back
const ARCADIAN_HELL_ENRAGE = [48833, 46391];
const BLOOD_WAKENING   = 46336;
const BLOOD_SHAPES     = [46337, 46338, 46339, 46340]; // Water III, Aero III, Straightforward Thunder II, Sideways Fire II
const SIDEWAYS_FIRE    = 46340;
const STRAIGHT_THUNDER = 46339;
const FARAWAY_PORTENT  = 1004766; // the wind tower's soaker (its knockback crosses islands)
// Healer limit break 3s (Techne Makre, Astral Stasis, Angel Feathers, Pulse
// of Life): the caster's own cast, then an ~8s animation lock.
const HEALER_LB3       = [24859, 4248, 4247, 208];
// The lock after an LB3 cast completes: Pull 11 (report D) 6:31.7 cast, the
// Sage's next action 6:40.4 (user, 2026-10-12: couldn't reach the tower).
const LB3_LOCK_MS      = 10_000;
// A wind tower knockback off the island: no killing blow 4.4s after Faraway
// Portent (D11 6:44.7, E7 6:44.7, E12 6:44.9).
const WIND_FALL_MIN_MS = 3000;
const WIND_FALL_MAX_MS = 6000;

// Avoidable hits, every one a Damage Down cause in the sample (Pyretic Wurm
// only ever killed).
type Avoidable = { name: string; hit: string; why: string };
const AVOIDABLE: Record<number, Avoidable> = {
  46375: { name: "Snaking Kick", hit: "Hit by Snaking Kick",
    why: "Snaking Kick hits half the room behind the boss; get to the safe side before it lands." },
  48789: { name: "Snaking Kick", hit: "Hit by a replayed Snaking Kick",
    why: "Replication 3 stores a Snaking Kick that replays when its reality returns; remember its safe side." },
  46300: { name: "Winged Scourge", hit: "Hit by Winged Scourge",
    why: "The cone clones of Replication 1 cover lanes from their cardinals; stay out of the lanes." },
  46373: { name: "Double Sobat", hit: "Hit by Double Sobat's turning cleave",
    why: "After the first hit Double Sobat turns and cleaves half the room; move to the side it leaves." },
  46317: { name: "Firefall Splash", hit: "Hit by a replayed Firefall Splash",
    why: "The replayed boss jump lands where it was recorded; stay off its landing point." },
  47394: { name: "Hemorrhagic Projection", hit: "Hit by a replayed Hemorrhagic Projection cone",
    why: "Replayed clone cones point at the arena center from their clone; stay out of the line." },
  46337: { name: "Blood Wakening", hit: "Hit by Lindwurm's Water III",
    why: "Blood Wakening sets off the Blood Mana shapes in two waves; stand in the safe spots for each wave." },
  46338: { name: "Blood Wakening", hit: "Hit by Lindwurm's Aero III",
    why: "Blood Wakening sets off the Blood Mana shapes in two waves; stand in the safe spots for each wave." },
  46339: { name: "Blood Wakening", hit: "Hit by Straightforward Thunder II",
    why: "Blood Wakening sets off the Blood Mana shapes in two waves; stand in the safe spots for each wave." },
  46340: { name: "Blood Wakening", hit: "Hit by Sideways Fire II",
    why: "Blood Wakening sets off the Blood Mana shapes in two waves; stand in the safe spots for each wave." },
  46358: { name: "Power Gusher", hit: "Hit by a replayed Power Gusher",
    why: "Replication 3's stored cones and chariot replay when blue returns; dodge them from memory." },
  46327: { name: "Lindwurm's Stone III", hit: "Hit by Lindwurm's Stone III",
    why: "The earth tower leaves a delayed circle; leave it before Stone III lands." },
  46329: { name: "Pyretic Wurm", hit: "Moved under Hot-Blooded and took Pyretic Wurm",
    why: "The fire tower gives Hot-Blooded; stand still until it ends." },
};

// One bait per player per instance: a player hit by another player's
// instance, or by two at once, is an overlap. The owner of an instance is its
// cast target, else the only player it hit, or the one player it hit who took
// nothing else.
// `proximity`: aimed at the nearest players; with anyone dead they retarget.
// `knockback`: knocks the players it hits back, so a no-killing-blow death
//   right after it is that overlap's death (off an island).
// `crowd`: an instance this many players took with no owner known is the
//   group under it, not a pair: player-less.
// `tanks`: only with both tanks alive and holding enmity.
// `shared`: an instance with no cast target is meant for several players (the
//   first Mighty Magic set hits a pair, every pull): only a player hit by two
//   instances, or by a cast-targeted one that isn't theirs, overlapped.
// `tanks` also means a tankbuster: a non-tank in it is named alone (they
//   stood in the tank's hit), the tanks only when they hit each other.
type Family = { name: string; ids: number[]; what: string; why: string; ruleId: string; gap?: number; proximity?: boolean; knockback?: boolean; crowd?: number; tanks?: boolean; shared?: boolean };
const PERSONAL: Family[] = [
  { name: "Mighty Magic", ids: [MIGHTY_MAGIC], what: "dark AoE", ruleId: LW2_OVERLAP_RULE_ID, proximity: true, shared: true,
    why: "Replication 1's dark Mighty Magic hits the players near each dark clone; the second set's four dark baits stand apart." },
  { name: "Scalding Waves", ids: [46309, 47329], what: "protean", ruleId: LW2_OVERLAP_RULE_ID, proximity: true,
    why: "Firefall Splash sends four Scalding Waves proteans at the nearest players; bait one each, apart from the rest." },
  { name: "Firefall Splash", ids: [46308], what: "jump", ruleId: LW2_OVERLAP_RULE_ID,
    why: "Firefall Splash jumps onto its bait; only the jump bait stands there." },
  { name: "Mana Burst", ids: [46311, 48099, 46360], what: "defamation", ruleId: LW2_DEFAM_RULE_ID, knockback: true, crowd: 3,
    why: "Mana Burst is a large defamation that knocks back everyone it hits; take it far from the party." },
  { name: "Esoteric Finisher", ids: [ESOTERIC_FINISHER], what: "Esoteric Finisher", ruleId: LW2_OVERLAP_RULE_ID, tanks: true,
    why: "Esoteric Finisher hits the top two on enmity; the tanks take one each, apart from each other and the party." },
  { name: "Arcadian Arcanum", ids: [47577], what: "light spread", ruleId: LW2_OVERLAP_RULE_ID,
    why: "Arcadian Arcanum puts a light spread on four players; spread them apart." },
  { name: "Portent cones", ids: [46330, 46328], what: "portent cone", ruleId: LW2_OVERLAP_RULE_ID, proximity: true,
    why: "The portents send Thunder II and Glare at the nearest and farthest players; each bait stands alone on their spot." },
];

// Stacks the whole party shares, two at a time.
type Stack = { name: string; ids: number[]; why: string; afterIdyllic?: boolean };
const STACKS: Stack[] = [
  { name: "Heavy Slam", ids: [HEAVY_SLAM_LIVE],
    why: "Replication 2's two Heavy Slam stacks are shared by everyone, four in each." },
  { name: "Heavy Slam", ids: [HEAVY_SLAM_IDYLLIC],
    why: "Idyllic Dream's live Heavy Slam stacks are shared by everyone, four in each." },
  { name: "Heavy Slam", ids: [HEAVY_SLAM_REPLAY], afterIdyllic: true,
    why: "The replayed Heavy Slams at the end of Idyllic Dream are shared by everyone, split between the two stacks." },
];
// Players resolving their own bait during a stack aren't missing from it.
const BUSY_IDS = [46311, 48099, 46360, 46308, 46384, 46309, 47329];

// FFLogs logs the death event ~2.0s after the fatal hit (README).
const DEATH_EVENT_LAG_MS = 2000;
const DIED_FROM_HIT_MS   = 3000;
// Mana Burst knockbacks off an island: no-killing-blow deaths 2.2-2.8s after
// the hit (D16 +6:25, D18 +6:21, E4 +6:15).
const KNOCKED_OFF_MS     = 4000;
const CALLED_WIPE_END_MS = 12_000;
const CALLED_WIPE_COUNT  = 3;
const CALLED_WIPE_WINDOW = 10_000;
const CALLED_WIPE_PAIR_MS = 5_000;
// 5 dead with the pull over within 45s; C8 lived 77s past 5 dead (raises
// after Idyllic Dream at +4:34), E7 65s past 4 dead.
const COLLAPSE_DEAD_COUNT = 5;
const COLLAPSE_END_MS     = 45_000;
// One mechanic killing this many within MASS_DEATH_MS ends the pull: Rep1's
// second set (A7, A13: 6), defams in the party (C6, C7: 5), Blood Wakening
// (B29, D19: 7-8). The pull ended within 60s every time.
const MASS_DEATHS        = 4;
const MASS_DEATH_MS      = 3000;
const MASS_DEATH_END_MS  = 60_000;
// Raidwides and autos never count toward a mass death.
const NOT_A_MECHANIC     = [0, 46367, 46376, IDYLLIC_DREAM, 46322, 46387, 46388, 46389, ...ARCADIAN_HELL_ENRAGE];
const TANK_ENMITY_LOST_MS = 30_000;
const UNSOAKED_DEATHS_MS = 12_000;
const TOWER_DEATHS       = 3;
// Hits this large are FFLogs' unpaired previews of lethal hits (README).
const PREVIEW_AMOUNT     = 1_500_000;
const STACK_DOOMED_DEAD  = 3;
// An absent player this close to a stack's center nearly made it.
const STACK_NEAR_MISS    = 600;
const RAISE_GRACE_MS     = 10_000;
// A live Hemorrhagic Projection cast sits on its holder: 0.0-0.1y in the
// kill (E13 +2:18), 2.0y in B27.
const CONE_OWNER_MAX     = 300;
const EPISODE_MS         = 3000;
// The resistance a Rep1 hit repeats must predate the hit by this much (the
// hit's own debuff lands with it).
const ELEMENT_HELD_MS    = 1500;
const DOOM_EXPIRED_MS    = 300;

// ── shared helpers ──────────────────────────────────────────────────────────

type Hit = { p: PlayerInfo; e: PlayerEvent };

type Life = {
  alive: (p: PlayerInfo, t: number) => boolean;
  hitAlive: (p: PlayerInfo, hitT: number) => boolean;
  diedFrom: (p: PlayerInfo, hitT: number) => DeathEvent | undefined;
  outIntervals: { p: PlayerInfo; start: number; end: number }[];
};

function buildLife(players: PlayerInfo[], deaths: DeathEvent[]): Life {
  const outIntervals: Life["outIntervals"] = [];
  for (const p of players) {
    const own = deaths.filter((d) => d.player === p.name).sort((a, b) => a.timestamp - b.timestamp);
    own.forEach((d, i) => {
      const next = own[i + 1]?.timestamp ?? Infinity;
      const end = rezzedAt(p, d.timestamp, next) ?? next - DEATH_EVENT_LAG_MS - 100;
      outIntervals.push({ p, start: d.timestamp - DEATH_EVENT_LAG_MS - 100, end });
    });
  }
  const alive = (p: PlayerInfo, t: number) => !outIntervals.some((w) => w.p === p && t >= w.start && t < w.end);
  return {
    outIntervals,
    alive,
    hitAlive: (p, hitT) => alive(p, hitT - 500),
    diedFrom: (p, hitT) => deaths.find((d) => d.player === p.name && d.timestamp >= hitT && d.timestamp <= hitT + DIED_FROM_HIT_MS),
  };
}

/** Hits on living players (a dead body still logs 0-damage hits). */
function hitsOf(players: PlayerInfo[], life: Life, ids: number | number[], from = -Infinity, to = Infinity): Hit[] {
  const set = new Set(Array.isArray(ids) ? ids : [ids]);
  const out: Hit[] = [];
  for (const p of players) {
    for (const e of p.damageTaken) {
      if (!set.has(e.abilityId) || e.timestamp < from || e.timestamp > to || e.healthBefore === 0) continue;
      if (life.hitAlive(p, e.timestamp)) out.push({ p, e });
    }
  }
  return out.sort((a, b) => a.e.timestamp - b.e.timestamp);
}

const castsOf = (casts: EnemyEvent[], ids: number | number[]) => {
  const set = new Set(Array.isArray(ids) ? ids : [ids]);
  return casts.filter((c) => set.has(c.abilityId)).sort((a, b) => a.timestamp - b.timestamp);
};

function gotDamageDown(p: PlayerInfo, t: number): boolean {
  return p.debuffs.some((e) => e.abilityId === DAMAGE_DOWN && e.debuffStatus === "applied" && Math.abs(e.timestamp - t) <= 1500);
}

/**
 * The aura was on the player from at least `heldMs` before `t` until `t`. A
 * removal and re-apply in the same millisecond is a refresh, not a gap: the
 * repeated Rep1 hit re-applies its resistance ~0.5s before its damage (D3
 * 1:03, D10 1:03).
 */
function heldBefore(p: PlayerInfo, id: number, t: number, heldMs: number): boolean {
  const ws = debuffIntervals(p, id);
  const merged: { start: number; end: number }[] = [];
  for (const w of ws) {
    const last = merged[merged.length - 1];
    if (last && w.start - last.end <= 50) last.end = w.end;
    else merged.push({ ...w });
  }
  return merged.some((w) => w.start <= t - heldMs && w.end >= t - 300);
}

/** One of the auras ended on the player within [t - before, t + after]. */
function auraEndedNear(p: PlayerInfo, ids: number[], t: number, before = 1500, after = 300): boolean {
  return p.debuffs.some((e) => ids.includes(e.abilityId) && e.debuffStatus === "removed" && e.timestamp >= t - before && e.timestamp <= t + after);
}

const uniq = <T,>(xs: T[]) => [...new Set(xs)];
const namesOf = (ps: PlayerInfo[]) => joinNames(uniq(ps).map((p) => p.name));
const isTank = (p: PlayerInfo) => p.role === "Tank";
const realAmount = (e: PlayerEvent) => ((e.amount ?? 0) >= PREVIEW_AMOUNT ? 0 : e.amount ?? 0);
const instanceKey = (e: PlayerEvent) => `${e.abilityId}|${e.source}#${e.sourceInstance}`;
const castKey = (c: EnemyEvent) => `${c.abilityId}|${c.actorName}#${c.sourceInstance}`;

function tankOutRecently(life: Life, p: PlayerInfo, t: number): boolean {
  return !life.hitAlive(p, t) || life.outIntervals.some((w) => w.p === p && w.start <= t && w.end >= t - TANK_ENMITY_LOST_MS);
}

/** Both tanks alive and holding enmity at `t` (otherwise busters retarget as fallout). */
function tanksHealthy(players: PlayerInfo[], life: Life, t: number): boolean {
  const tanks = players.filter(isTank);
  return tanks.length >= 2 && tanks.every((p) => !tankOutRecently(life, p, t));
}

/** Raised within RAISE_GRACE_MS before `t` (or still out at `t`). */
function inRaiseGrace(life: Life, p: PlayerInfo, t: number): boolean {
  return !life.hitAlive(p, t) || life.outIntervals.some((w) => w.p === p && w.end <= t && t - w.end < RAISE_GRACE_MS);
}

/** Players who took a listed avoidable hit within 2s of `t`: already flagged for it. */
function inAvoidable(p: PlayerInfo, t: number): boolean {
  return p.damageTaken.some((e) => AVOIDABLE[e.abilityId] && Math.abs(e.timestamp - t) <= 2000 && realAmount(e) > 0);
}

function positionAt(p: PlayerInfo, t: number) {
  return interpolatePlayerPosition(p, t, { windowMs: 2000, maxSpanMs: 3000 }) ?? findPlayerPosition(p, t, { windowMs: 2000 });
}

/** A no-killing-blow death right after a knockback defam hit the player. */
function knockedOffBy(p: PlayerInfo, d: DeathEvent): PlayerEvent | undefined {
  return p.damageTaken.filter((e) => MANA_BURST_KNOCK.includes(e.abilityId) && e.healthBefore !== 0 &&
    e.timestamp <= d.timestamp && e.timestamp >= d.timestamp - KNOCKED_OFF_MS).pop();
}

/** The wind tower's Faraway Portent applied 3-6s before this no-killing-blow death. */
function windKnockBefore(p: PlayerInfo, d: DeathEvent): PlayerEvent | undefined {
  return p.debuffs.find((e) => e.abilityId === FARAWAY_PORTENT && e.debuffStatus === "applied" &&
    d.timestamp - e.timestamp >= WIND_FALL_MIN_MS && d.timestamp - e.timestamp <= WIND_FALL_MAX_MS);
}

/** Still animation-locked from their own healer LB3 at `t`. */
function inLimitBreak(p: PlayerInfo, t: number): boolean {
  return p.casts.some((e) => HEALER_LB3.includes(e.abilityId) && e.timestamp <= t && t - e.timestamp <= LB3_LOCK_MS);
}

/**
 * Blood Wakening waves whose shapes came out wrong. In every clean pull each
 * wave is Water + Aero + 2 Sideways Fire + 2 Straightforward Thunder (all 30
 * Blood Wakening pulls but one); a wrong contact stalls the wrong shapes and
 * a wave comes out 4 + 0 (Pull 7 of report D: 4 Fire, then 4 Thunder; user,
 * 2026-10-12: the tank contacted purple instead of orange).
 */
function brokenWakeWaves(casts: EnemyEvent[]): EnemyEvent[][] {
  const bw = castsOf(casts, BLOOD_WAKENING)[0];
  if (!bw) return [];
  const waves = clusterByGap(castsOf(casts, BLOOD_SHAPES).filter((c) => c.timestamp > bw.timestamp && c.timestamp < bw.timestamp + 15_000), (c) => c.timestamp, 1000);
  return waves.filter((w) => w.length >= 6 && (w.filter((c) => c.abilityId === SIDEWAYS_FIRE).length !== 2 || w.filter((c) => c.abilityId === STRAIGHT_THUNDER).length !== 2));
}

/** The Doom on the player ran out (not cleansed) just before this death. */
function doomExpiredBefore(p: PlayerInfo, d: DeathEvent): { start: number; end: number } | undefined {
  return debuffIntervals(p, DOOM).find((w) => w.end <= d.timestamp && w.end >= d.timestamp - DEATH_EVENT_LAG_MS - 1500 &&
    p.debuffs.some((e) => e.abilityId === DOOM && e.debuffStatus === "applied" && e.timestamp === w.start &&
      e.durationMs !== undefined && w.end - w.start >= e.durationMs - DOOM_EXPIRED_MS));
}

// ── plain avoidable hits ────────────────────────────────────────────────────

function detectAvoidable(players: PlayerInfo[], life: Life, broken: EnemyEvent[][]): PullError[] {
  const errors: PullError[] = [];
  const ids = Object.keys(AVOIDABLE).map(Number);
  // A shape wave broken by a wrong contact is the contact's error, not the
  // victims' (their safe spot was gone).
  const inBroken = (e: PlayerEvent) => BLOOD_SHAPES.includes(e.abilityId) && broken.some((w) => Math.abs(e.timestamp - w[0].timestamp) <= 2000);
  for (const p of players) {
    const hits = p.damageTaken.filter((e) => ids.includes(e.abilityId) && e.healthBefore !== 0 && life.hitAlive(p, e.timestamp) && !inBroken(e) &&
      (realAmount(e) > 0 || (e.amount ?? 0) >= PREVIEW_AMOUNT || gotDamageDown(p, e.timestamp)));
    for (const g of clusterByGap(hits, (e) => e.timestamp, EPISODE_MS)) {
      const kinds = uniq(g.map((e) => AVOIDABLE[e.abilityId]));
      const total = g.reduce((s, e) => s + realAmount(e), 0);
      const death = life.diedFrom(p, g[g.length - 1].timestamp);
      const dd = g.some((e) => gotDamageDown(p, e.timestamp));
      const hit = kinds.map((k, i) => (i === 0 ? k.hit : k.hit.charAt(0).toLowerCase() + k.hit.slice(1))).join(", and ");
      const outcome = [dd ? "got Damage Down" : "", death ? "died" : ""].filter(Boolean).join(" and ");
      errors.push(playerError(p, {
        ruleId: LW2_AVOIDABLE_RULE_ID, severity: dd || death ? "Major" : "Minor", name: `Hit by ${uniq(kinds.map((k) => k.name)).join(" / ")}`,
        description: `${hit} (${g.length > 1 ? `${g.length} hits, ` : ""}${kFmt(total)}).${outcome ? ` They ${outcome}.` : ""} ${uniq(kinds.map((k) => k.why)).join(" ")}`,
        timestamp: g[0].timestamp, abilityId: g[0].abilityId, abilityName: g[0].abilityName,
      }));
    }
  }
  return errors;
}

// ── Replication 1: repeating an element ─────────────────────────────────────

/**
 * Replication 1's fire (Top-Tier Slam) and dark (Mighty Magic) hits leave
 * Fire / Dark Resistance Down II; the second set must take the other element.
 * A hit of the element whose resistance the player already held is the wrong
 * spot (69 of 71 such hits killed, reports A and B). Returns the errors and
 * the repeat hits, which the dark overlap family then leaves alone.
 */
function detectElements(players: PlayerInfo[], life: Life, casts: EnemyEvent[]): { errors: PullError[]; repeats: Set<PlayerEvent> } {
  const errors: PullError[] = [];
  const repeats = new Set<PlayerEvent>();
  const darkTargets = castsOf(casts, MIGHTY_MAGIC).filter((c) => c.target);
  for (const p of players) {
    const hits = p.damageTaken.filter((e) => (e.abilityId === TOP_TIER_SLAM || e.abilityId === MIGHTY_MAGIC) && e.healthBefore !== 0 &&
      life.hitAlive(p, e.timestamp) && heldBefore(p, e.abilityId === TOP_TIER_SLAM ? FIRE_RES_DOWN : DARK_RES_DOWN, e.timestamp, ELEMENT_HELD_MS));
    for (const g of clusterByGap(hits, (e) => e.timestamp, EPISODE_MS)) {
      g.forEach((e) => repeats.add(e));
      const t = g[0].timestamp;
      const fire = g.some((e) => e.abilityId === TOP_TIER_SLAM);
      const death = life.diedFrom(p, g[g.length - 1].timestamp);
      const killed = death && (death.killingAbilityGameId === TOP_TIER_SLAM || death.killingAbilityGameId === MIGHTY_MAGIC || !death.killingAbilityGameId);
      // A second-set dark is cast-targeted: name whose it was.
      const owners = uniq(g.filter((e) => e.abilityId === MIGHTY_MAGIC).map((e) =>
        darkTargets.find((c) => c.sourceInstance === e.sourceInstance && Math.abs(c.timestamp - e.timestamp) <= 2000)?.target)
        .filter((n): n is string => !!n && n !== p.name));
      const element = fire ? "fire (Top-Tier Slam)" : "dark (Mighty Magic)";
      errors.push(playerError(p, {
        ruleId: LW2_ELEMENT_RULE_ID, severity: killed ? "Major" : "Minor", name: "Took the Same Element Twice",
        description: `Took ${element} again while still holding ${fire ? "Fire" : "Dark"} Resistance Down II from the first set${owners.length ? ` (${joinNames(owners)}'s dark bait)` : ""}, ${kFmt(g.reduce((s, e) => s + realAmount(e), 0))}.${killed ? " They died." : ""} In Replication 1 each player alternates: the dark-hit players take the fire stacks next, the fire-hit and unhit players take the dark.`,
        timestamp: t, abilityId: g[0].abilityId, abilityName: g[0].abilityName,
      }));
    }
  }
  // The second set hits everyone once (kill: 4 fire in two pairs + 4 dark).
  // A fire taken alone was missing its partner: the living player who took
  // no element in that set is named, not the lone taker (user, 2026-10-12,
  // Pull 1 of report D at 1:02: the healer should have stacked with the
  // Pictomancer on the waymark).
  const sets = clusterByGap(hitsOf(players, life, [TOP_TIER_SLAM, MIGHTY_MAGIC]), (h) => h.e.timestamp, 5000);
  const set2 = sets[1];
  if (set2 && !players.some((p) => !life.hitAlive(p, sets[0][0].e.timestamp) || !life.hitAlive(p, set2[0].e.timestamp))) {
    const t = set2[0].e.timestamp;
    const fires = new Map<string, PlayerInfo[]>();
    for (const h of set2.filter((x) => x.e.abilityId === TOP_TIER_SLAM)) fires.set(instanceKey(h.e), uniq([...(fires.get(instanceKey(h.e)) ?? []), h.p]));
    const lone = [...fires.values()].filter((ps) => ps.length === 1).map((ps) => ps[0]);
    const idle = players.filter((p) => !set2.some((h) => h.p === p) && life.hitAlive(p, t) && !inRaiseGrace(life, p, t) && !inAvoidable(p, t));
    // Only when the lone taker died: a tank soloing a fire under mitigation
    // survived it 13 times in report B.
    const died = lone.filter((p) => { const d = life.diedFrom(p, t); return d && d.killingAbilityGameId === TOP_TIER_SLAM; });
    const named = new Set<PlayerInfo>();
    if (died.length && idle.length) {
      for (const p of idle) {
        named.add(p);
        errors.push(playerError(p, {
          ruleId: LW2_ELEMENT_RULE_ID, severity: "Major", name: "Missed Their Element",
          description: `Took neither fire nor dark in Replication 1's second set while ${namesOf(died)} took a Top-Tier Slam alone and died. Every player takes one element in the second set: the dark-hit players pair up for the two fires.`,
          timestamp: t, abilityId: TOP_TIER_SLAM, abilityName: "Top-Tier Slam",
        }));
      }
    }
    // A second-set dark is a bait the fire-hit and unhit players owe. When a
    // dark-hit player who took their fire was also hit by a dark, that dark
    // had no bait: the player who owed one and took none is named, not the
    // fire pair it fell on (user, 2026-10-14, A12 1:02: the PCT wasn't north on
    // A to bait it, so it retargeted the PLD and RPR).
    const took = (s: Hit[], p: PlayerInfo, id: number) => s.some((h) => h.p === p && h.e.abilityId === id);
    const caught = players.filter((p) => took(sets[0], p, MIGHTY_MAGIC) && took(set2, p, TOP_TIER_SLAM) && took(set2, p, MIGHTY_MAGIC));
    const repeated = new Set(errors.filter((e) => e.timestamp >= t - 500).map((e) => e.player));
    const skipped = players.filter((p) => !took(sets[0], p, MIGHTY_MAGIC) && !took(set2, p, MIGHTY_MAGIC) &&
      life.hitAlive(p, t) && !inRaiseGrace(life, p, t) && !inAvoidable(p, t));
    if (caught.length && skipped.length) {
      const caughtNames = new Set(caught.map((p) => p.name));
      for (let i = errors.length - 1; i >= 0; i--) {
        const e = errors[i];
        if (caughtNames.has(e.player!) && e.abilityId === MIGHTY_MAGIC && e.timestamp >= t - 500) errors.splice(i, 1);
      }
      const dead = caught.filter((p) => !!life.diedFrom(p, set2[set2.length - 1].e.timestamp));
      for (const p of skipped) {
        // Already named for this set (a lone fire, a repeat): that error covers it.
        if (named.has(p) || repeated.has(p.name)) continue;
        const first = took(sets[0], p, TOP_TIER_SLAM) ? "a fire" : "no element";
        errors.push(playerError(p, {
          ruleId: LW2_ELEMENT_RULE_ID, severity: dead.length ? "Major" : "Minor", name: "Missed Their Dark Bait",
          description: `Took ${first} in Replication 1's first set, so they owed a dark bait in the second, but took ${took(set2, p, TOP_TIER_SLAM) ? "a fire" : "nothing"} instead. The unbaited dark retargeted onto ${namesOf(caught)}, who already held Dark Resistance Down II.${dead.length ? ` ${namesOf(dead)} died.` : ""} The fire-hit and unhit players each stand on their dark clone's spot in the second set.`,
          timestamp: t, abilityId: MIGHTY_MAGIC, abilityName: "Mighty Magic",
        }));
      }
    }
  }
  return { errors, repeats };
}

// ── Blood Mana: the wrong shape contacted ───────────────────────────────────

/**
 * A Blood Wakening wave that came out with 4 of one shape (brokenWakeWaves)
 * means the wrong shapes were contacted. The cast-targeted Bloody Burst is
 * the solo contact (the tank's, every pull); it is named. The waves' victims
 * aren't (detectAvoidable).
 */
function detectContact(players: PlayerInfo[], life: Life, casts: EnemyEvent[], broken: EnemyEvent[][]): PullError[] {
  if (!broken.length) return [];
  const bw = castsOf(casts, BLOOD_WAKENING)[0];
  const contact = castsOf(casts, BLOODY_BURST).filter((c) => c.target && c.timestamp < bw.timestamp)[0];
  const p = contact && players.find((x) => x.name === contact.target);
  const hit = uniq(broken.flatMap((w) => hitsOf(players, life, BLOOD_SHAPES, w[0].timestamp - 500, w[0].timestamp + 2000).map((h) => h.p)));
  const died = hit.filter((x) => { const d = life.diedFrom(x, broken[broken.length - 1][0].timestamp - 500); return d && BLOOD_SHAPES.includes(d.killingAbilityGameId); });
  const waves = broken.map((w) => {
    const n = (id: number) => w.filter((c) => c.abilityId === id).length;
    return `${n(SIDEWAYS_FIRE)} Sideways Fire / ${n(STRAIGHT_THUNDER)} Straightforward Thunder`;
  }).join(", then ");
  const what = `The Blood Wakening waves came out ${waves} instead of two of each, so the wrong shapes had been contacted and the safe spots were gone.${hit.length ? ` The shapes hit ${namesOf(hit)}${died.length ? `; ${namesOf(died)} died` : ""}.` : ""} Identify the two closely paired shapes and contact the matching two on the other side.`;
  if (!p) return [playerlessMinor(LW2_CONTACT_RULE_ID, "Wrong Shape Contacted", what, broken[0][0].timestamp, broken[0][0].abilityId, "Blood Wakening")];
  return [playerError(p, {
    ruleId: LW2_CONTACT_RULE_ID, severity: "Major", name: "Contacted the Wrong Shape",
    description: `Their Bloody Burst contact stalled the wrong shape. ${what}`,
    timestamp: contact.timestamp, abilityId: BLOODY_BURST, abilityName: "Bloody Burst",
  })];
}

// ── Replication 2: live cones ───────────────────────────────────────────────

/**
 * Hemorrhagic Projection: Grotesquerie (46314) marks the two cone holders and
 * each cone's cast sits on its holder (0.0-0.1y in the kill). A clean
 * resolution hits nobody (every clean pull). A cone that hit someone names
 * the holder standing on its cast, never one of its victims; none placed
 * leaves a player-less error.
 */
function detectCones(players: PlayerInfo[], life: Life, casts: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  const coneCasts = castsOf(casts, HEMORRHAGIC);
  const holderCasts = castsOf(casts, GROTESQUERIE).filter((c) => c.target);
  for (const res of clusterByGap(hitsOf(players, life, HEMORRHAGIC), (h) => h.e.timestamp, 1500)) {
    const t = res[0].e.timestamp;
    const holders = uniq(holderCasts.filter((c) => c.timestamp <= t && c.timestamp >= t - 4000)
      .map((c) => players.find((p) => p.name === c.target)).filter((p): p is PlayerInfo => !!p));
    const byInst = new Map<number, Hit[]>();
    for (const h of res) if (h.e.sourceInstance !== undefined) byInst.set(h.e.sourceInstance, [...(byInst.get(h.e.sourceInstance) ?? []), h]);
    for (const [inst, hs] of byInst) {
      const victims = uniq(hs.map((h) => h.p));
      const c = coneCasts.filter((x) => x.sourceInstance === inst && x.timestamp <= t + 200 && x.timestamp >= t - 3000).pop();
      let owners: PlayerInfo[] = [];
      let dist: number | undefined;
      if (c?.x !== undefined && c.y !== undefined) {
        const near = holders.filter((p) => !victims.includes(p) && life.hitAlive(p, c.timestamp))
          .map((p) => { const q = positionAt(p, c.timestamp); return { p, d: q ? Math.hypot(q.x - c.x!, q.y - c.y!) : Infinity }; })
          .filter((x) => x.d <= CONE_OWNER_MAX);
        owners = near.map((x) => x.p);
        dist = near[0]?.d;
      }
      const killed = victims.filter((p) => life.diedFrom(p, t)?.killingAbilityGameId === HEMORRHAGIC);
      const dd = victims.filter((p) => gotDamageDown(p, t));
      const outcome = `${dd.length ? ` ${namesOf(dd)} got Damage Down.` : ""}${killed.length ? ` ${namesOf(killed)} died.` : ""}`;
      const why = "Each Grotesquerie cone fires the way its holder faces; face it away from everyone before it fires.";
      if (!owners.length) {
        errors.push(playerlessMinor(LW2_CONE_RULE_ID, "Hemorrhagic Projection Hit Someone",
          `A Hemorrhagic Projection cone hit ${namesOf(victims)}; its holder couldn't be placed from the log.${outcome} ${why}`,
          t, HEMORRHAGIC, "Hemorrhagic Projection"));
        continue;
      }
      for (const o of owners) {
        errors.push(playerError(o, {
          ruleId: LW2_CONE_RULE_ID, severity: killed.length || dd.length ? "Major" : "Minor", name: "Cone Hit Someone",
          description: `${owners.length > 1 ? `Their cone or ${namesOf(owners.filter((x) => x !== o))}'s` : "Their"} Hemorrhagic Projection cone hit ${namesOf(victims)}${dist !== undefined && owners.length === 1 ? ` (the cone fired from ~${yd(dist)} yalms of them)` : ""}.${outcome} ${why}`,
          timestamp: t, abilityId: HEMORRHAGIC, abilityName: "Hemorrhagic Projection",
        }));
      }
    }
  }
  return errors;
}

// ── overlapping personal baits ──────────────────────────────────────────────

function detectPersonalOverlaps(players: PlayerInfo[], life: Life, casts: EnemyEvent[], deaths: DeathEvent[], skip: Set<PlayerEvent>): PullError[] {
  const errors: PullError[] = [];
  for (const fam of PERSONAL) {
    for (const res0 of clusterByGap(hitsOf(players, life, fam.ids), (h) => h.e.timestamp, fam.gap ?? 1500)) {
      const res = res0.filter((h) => !skip.has(h.e));
      if (!res.length) continue;
      const t0 = res[0].e.timestamp, t1 = res[res.length - 1].e.timestamp;
      if (fam.proximity && players.some((p) => !life.hitAlive(p, t0))) continue;
      if (fam.tanks && !tanksHealthy(players, life, t0 - DIED_FROM_HIT_MS)) continue;
      // Instances that also hit someone in raise grace: drop them.
      const tainted = new Set<string>();
      for (const p of players) {
        for (const e of p.damageTaken) {
          if (fam.ids.includes(e.abilityId) && e.timestamp >= t0 - 1500 && e.timestamp <= t1 + 500 && inRaiseGrace(life, p, e.timestamp)) tainted.add(instanceKey(e));
        }
      }
      const byInst = new Map<string, Hit[]>();
      const byPlayer = new Map<PlayerInfo, Set<string>>();
      for (const h of res) {
        const k = instanceKey(h.e);
        if (tainted.has(k)) continue;
        byInst.set(k, [...(byInst.get(k) ?? []), h]);
        byPlayer.set(h.p, (byPlayer.get(h.p) ?? new Set()).add(k));
      }
      if (!byInst.size) continue;
      const owners = new Map<string, PlayerInfo>();
      for (const c of casts) {
        if (!fam.ids.includes(c.abilityId) || c.timestamp < t0 - 2000 || c.timestamp > t1 || c.sourceInstance === undefined || !c.target) continue;
        const p = players.find((x) => x.name === c.target);
        if (p) owners.set(castKey(c), p);
      }
      for (const [k, hs] of byInst) {
        if (owners.has(k) || fam.shared) continue;
        const hit = uniq(hs.map((h) => h.p));
        const only = hit.filter((p) => byPlayer.get(p)!.size === 1);
        if (hs.length === 1) owners.set(k, hs[0].p);
        else if (only.length === 1 && hit.length > 1) owners.set(k, only[0]);
      }
      const diedTo = (p: PlayerInfo) => {
        const last = res.filter((h) => h.p === p).pop()?.e.timestamp ?? t0;
        const d = life.diedFrom(p, last);
        if (d && fam.ids.includes(d.killingAbilityGameId)) return true;
        return !!fam.knockback && deaths.some((x) => x.player === p.name && !x.killingAbilityGameId && x.timestamp >= last && x.timestamp <= last + KNOCKED_OFF_MS);
      };
      // An unowned instance on a crowd is the group under it: player-less.
      for (const [k, hs] of [...byInst]) {
        const hit = uniq(hs.map((h) => h.p));
        if (!fam.crowd || owners.has(k) || hit.length < fam.crowd) continue;
        const killed = hit.filter(diedTo);
        errors.push(playerlessMinor(fam.ruleId, `${fam.name} Hit the Group`,
          `One ${fam.what} hit ${hit.length} players at once (${namesOf(hit)}); its owner can't be told apart from the log.${killed.length ? ` ${namesOf(killed)} died.` : ""} ${fam.why}`,
          hs[0].e.timestamp, hs[0].e.abilityId, fam.name));
        byInst.delete(k);
        for (const p of hit) byPlayer.get(p)?.delete(k);
      }
      const links = new Map<PlayerInfo, Set<PlayerInfo>>();
      const link = (a: PlayerInfo, b: PlayerInfo) => {
        links.set(a, (links.get(a) ?? new Set()).add(b));
        links.set(b, (links.get(b) ?? new Set()).add(a));
      };
      const hitTwice = new Set<PlayerInfo>();
      for (const [p, ks] of byPlayer) {
        const foreign = [...ks].filter((k) => owners.get(k) !== p && (owners.has(k) || !fam.shared));
        if (ks.size < 2 && foreign.length === 0) continue;
        if (ks.size >= 2) hitTwice.add(p);
        if (!links.has(p)) links.set(p, new Set());
        for (const k of ks) {
          const o = owners.get(k);
          if (o) { if (o !== p) link(p, o); }
          else if (!fam.shared || ks.size >= 2) for (const h of byInst.get(k)!) if (h.p !== p && (!fam.shared || byPlayer.get(h.p)!.size >= 2)) link(p, h.p);
        }
      }
      if (!links.size) continue;
      const seen = new Set<PlayerInfo>();
      for (const start of links.keys()) {
        if (seen.has(start)) continue;
        const group: PlayerInfo[] = [];
        const stack = [start];
        while (stack.length) {
          const p = stack.pop()!;
          if (seen.has(p)) continue;
          seen.add(p);
          group.push(p);
          for (const q of links.get(p) ?? []) stack.push(q);
        }
        if (group.length < 2 && !hitTwice.has(group[0])) continue;
        const killed = group.filter(diedTo);
        const severity = killed.length ? "Major" : "Minor";
        const deathText = killed.length ? ` ${namesOf(killed)} died.` : "";
        if (fam.tanks && group.some(isTank) && group.some((p) => !isTank(p))) {
          for (const p of group.filter((x) => !isTank(x))) {
            const tanks = [...(links.get(p) ?? [])].filter(isTank);
            errors.push(playerError(p, {
              ruleId: LW2_FINISHER_RULE_ID, severity, name: `In ${fam.name}`,
              description: `Stood in ${tanks.length ? `${namesOf(tanks)}'s` : "a tank's"} ${fam.what}.${deathText} ${fam.why}`,
              timestamp: t0, abilityId: fam.ids[0], abilityName: fam.name,
            }));
          }
          continue;
        }
        for (const p of group) {
          const others = [...(links.get(p) ?? [])];
          const n = byPlayer.get(p)?.size ?? 0;
          const description = hitTwice.has(p) || [...(byPlayer.get(p) ?? [])].some((k) => owners.get(k) !== p)
            ? `Hit by ${n > 1 ? `${n} ${fam.what}s at once` : `another player's ${fam.what}`}${others.length ? ` (with ${namesOf(others)})` : ""}.`
            : `Their ${fam.what} also hit ${namesOf(others)}.`;
          errors.push(playerError(p, {
            ruleId: fam.ruleId, severity, name: `${fam.name} Overlap`,
            description: `${description}${deathText} ${fam.why}`,
            timestamp: t0, abilityId: fam.ids[0], abilityName: fam.name,
          }));
        }
      }
    }
  }
  return errors;
}

// ── shared stacks ───────────────────────────────────────────────────────────

/**
 * Two Heavy Slam stacks shared by everyone. A player hit by both stacked them
 * together; a stack that killed someone while a living player took neither
 * names that player (unless they were resolving their own bait).
 */
function detectStacks(players: PlayerInfo[], life: Life, casts: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  const idyllic = castsOf(casts, IDYLLIC_DREAM)[0]?.timestamp ?? Infinity;
  for (const fam of STACKS) {
    for (const res of clusterByGap(hitsOf(players, life, fam.ids), (h) => h.e.timestamp, 1500)) {
      const t = res[0].e.timestamp;
      if (fam.afterIdyllic && t < idyllic) continue;
      if (players.filter((p) => !life.alive(p, t)).length >= STACK_DOOMED_DEAD) continue;
      const byPlayer = new Map<PlayerInfo, Set<string>>();
      for (const h of res) byPlayer.set(h.p, (byPlayer.get(h.p) ?? new Set()).add(instanceKey(h.e)));
      const killed = [...byPlayer.keys()].filter((p) => {
        const d = life.diedFrom(p, res.filter((h) => h.p === p).pop()!.e.timestamp);
        return d && fam.ids.includes(d.killingAbilityGameId);
      });
      const deathText = killed.length ? ` ${namesOf(killed)} died.` : "";
      const doubled = [...byPlayer].filter(([, ks]) => ks.size >= 2).map(([p]) => p);
      if (doubled.length) {
        errors.push(...doubled.map((p) => playerError(p, {
          ruleId: LW2_STACK_RULE_ID, severity: killed.length ? "Major" : "Minor", name: `Took Both ${fam.name} Stacks`,
          description: `Was in both ${fam.name} stacks at once (with ${namesOf(doubled.filter((x) => x !== p))}), so the two stacks landed on top of each other.${deathText} ${fam.why}`,
          timestamp: t, abilityId: fam.ids[0], abilityName: fam.name,
        })));
      }
      if (!killed.length) continue;
      const centers = uniq(res.map((h) => instanceKey(h.e))).map((k) => {
        const at = res.filter((h) => instanceKey(h.e) === k && h.e.x !== undefined && h.e.y !== undefined);
        return at.length ? { x: at.reduce((s, h) => s + h.e.x!, 0) / at.length, y: at.reduce((s, h) => s + h.e.y!, 0) / at.length } : undefined;
      }).filter((c): c is { x: number; y: number } => !!c);
      const busy = (p: PlayerInfo) => p.damageTaken.some((e) => BUSY_IDS.includes(e.abilityId) && Math.abs(e.timestamp - t) <= 2500);
      const absent = players.filter((p) => !byPlayer.has(p) && life.hitAlive(p, t) && !inRaiseGrace(life, p, t) && !inAvoidable(p, t) && !busy(p) && !inLimitBreak(p, t)).map((p) => {
        const q = positionAt(p, t);
        return { p, d: q && centers.length ? Math.min(...centers.map((c) => Math.hypot(q.x - c.x, q.y - c.y))) : undefined };
      }).filter((a) => a.d === undefined || a.d > STACK_NEAR_MISS);
      // A stack one player took alone while others took none: that player
      // carried it away from the group (user, 2026-10-12, Pull 6 of report D
      // at 6:12: the healer ran to the intercardinal instead of the waymark;
      // the three "absent" players were on the waymark).
      const lone = uniq(res.map((h) => instanceKey(h.e))).map((k) => uniq(res.filter((h) => instanceKey(h.e) === k).map((h) => h.p)))
        .filter((ps) => ps.length === 1 && byPlayer.get(ps[0])!.size === 1).map((ps) => ps[0]);
      if (absent.length && lone.length) {
        for (const p of lone) {
          errors.push(playerError(p, {
            ruleId: LW2_STACK_RULE_ID, severity: "Major", name: `Took ${fam.name} Away`,
            description: `Took a ${fam.name} stack alone while ${namesOf(absent.map((a) => a.p))} took neither, so the stack left the group.${deathText} ${fam.why}`,
            timestamp: t, abilityId: fam.ids[0], abilityName: fam.name,
          }));
        }
        continue;
      }
      for (const a of absent) {
        errors.push(playerError(a.p, {
          ruleId: LW2_STACK_RULE_ID, severity: "Major", name: `Missed ${fam.name}`,
          description: `Took neither ${fam.name} stack${a.d !== undefined ? ` (~${yd(a.d)} yalms from the nearer one)` : ""}; ${byPlayer.size} took them and ${namesOf(killed)} died. ${fam.why}`,
          timestamp: t, abilityId: fam.ids[0], abilityName: fam.name,
        }));
      }
    }
  }
  // A clone stack nobody took hits the raid as Unmitigated Impact: who was
  // meant to take it isn't in the log.
  for (const c of clusterByGap(castsOf(casts, UNMITIGATED_IMPACT), (x) => x.timestamp, 1500)) {
    const hit = uniq(players.filter((p) => p.damageTaken.some((e) => e.abilityId === UNMITIGATED_IMPACT && e.healthBefore !== 0 && e.timestamp >= c[0].timestamp && e.timestamp <= c[0].timestamp + 2000)));
    errors.push(playerlessMinor(LW2_STACK_RULE_ID, "Clone Stack Unsoaked",
      `${c.length === 1 ? "A clone Heavy Slam stack" : `${c.length} clone Heavy Slam stacks`} went untaken, so Unmitigated Impact hit ${hit.length ? namesOf(hit) : "the raid"}. Every clone stack needs its assigned players under it.`,
      c[0].timestamp, UNMITIGATED_IMPACT, "Unmitigated Impact"));
  }
  return errors;
}

// ── Blood Mana: mutations ───────────────────────────────────────────────────

/**
 * Mutating Cells gives four players Mutation α and four Mutation β; at each
 * check (Blood Mana's contacts, then Netherworld) every β must have been hit
 * (Bloody Burst / Wailing Wave) and every α must not. A player who failed
 * takes Unmitigated Explosion (46344) with Damage Down; the others take a
 * 0-damage Dramatic Lysis. Both statuses swap after each check.
 */
function detectMutation(players: PlayerInfo[], life: Life): PullError[] {
  const errors: PullError[] = [];
  for (const { p, e } of hitsOf(players, life, MUTATION_FAILED)) {
    const t = e.timestamp;
    const alpha = auraEndedNear(p, [MUTATION_A], t, 1500, 500);
    const beta = auraEndedNear(p, [MUTATION_B], t, 1500, 500);
    // Any hit since the status was handed out counts (C12 +3:53 an α in
    // Wailing Wave, E11 +3:54 an α in Sideways Fire II); DoTs and autos aside.
    const since = Math.max(...debuffIntervals(p, alpha ? MUTATION_A : MUTATION_B).filter((w) => w.start < t).map((w) => w.start), t - 30_000);
    const took = p.damageTaken.filter((x) => x.healthBefore !== 0 && (x.amount ?? 0) > 0 && x.timestamp >= since && x.timestamp < t - 200 &&
      x.abilityId < 1_000_000 && x.abilityId !== 500000 && x.abilityName !== "Attack");
    const dd = gotDamageDown(p, t);
    const d = life.diedFrom(p, t);
    const what = beta && !took.length
      ? "Held Mutation β and took no hit (Bloody Burst or Wailing Wave) before the check"
      : alpha && took.length
        ? `Held Mutation α and was hit by ${uniq(took.map((x) => x.abilityName)).join(" and ")} before the check`
        : "Their mutation failed at the check";
    errors.push(playerError(p, {
      ruleId: LW2_MUTATION_RULE_ID, severity: dd || d ? "Major" : "Minor", name: "Mutation Failed",
      description: `${what}, so it exploded as Unmitigated Explosion (${kFmt(realAmount(e))}).${dd ? " They got Damage Down." : ""}${d ? " They died." : ""} Mutation β players must take a hit (the contacted shape's Bloody Burst, then Wailing Wave) and Mutation α players must take none.`,
      timestamp: t, abilityId: MUTATION_FAILED, abilityName: "Unmitigated Explosion",
    }));
  }
  return errors;
}

// ── Idyllic Dream: Cosmic Kiss towers ───────────────────────────────────────

/**
 * Eight Cosmic Kiss towers, each cast-targeted at its soaker. An empty tower
 * explodes as Unmitigated Explosion (46325, one per empty tower) on the raid.
 * The living players who soaked nothing are named when they match the empty
 * count; otherwise player-less. 3+ deaths to it and its DoT end the pull.
 */
function detectTowers(players: PlayerInfo[], life: Life, casts: EnemyEvent[], deaths: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const empties of clusterByGap(castsOf(casts, TOWER_EMPTY), (c) => c.timestamp, 3000)) {
    const t = empties[0].timestamp;
    const emptyCount = uniq(empties.map((c) => c.sourceInstance)).length;
    const soakers = new Set(castsOf(casts, COSMIC_KISS).filter((c) => Math.abs(c.timestamp - t) <= 3000).map((c) => c.target).filter(Boolean));
    const free = players.filter((p) => !soakers.has(p.name) && life.hitAlive(p, t) && !inRaiseGrace(life, p, t));
    // A healer locked in their own LB3 couldn't get there (user, 2026-10-12,
    // Pull 11 of report D at 6:40: the Sage's Techne Makre at 6:31.7, next
    // action 6:40.4): not named, and the tower goes player-less.
    const locked = free.filter((p) => inLimitBreak(p, t));
    const lost = uniq(deaths.filter((d) => (d.killingAbilityGameId === TOWER_EMPTY || d.killingAbilityGameId === SUSTAINED_DAMAGE) &&
      d.timestamp >= t && d.timestamp <= t + UNSOAKED_DEATHS_MS).map((d) => d.player));
    const deathText = lost.length ? ` ${joinNames(lost)} died to the explosion and its damage over time.` : "";
    const why = "Each of the eight Downfall towers takes one player; soak the one your group and Arcanum swap assign you.";
    if (free.length && free.length === emptyCount && emptyCount <= 2 && !locked.length) {
      for (const p of free) {
        errors.push(playerError(p, {
          ruleId: LW2_TOWER_RULE_ID, severity: "Major", name: "Missed a Tower",
          description: `Soaked no tower while ${emptyCount === 1 ? "one Cosmic Kiss tower" : `${emptyCount} Cosmic Kiss towers`} went empty, so Unmitigated Explosion hit the raid.${deathText} ${why}`,
          timestamp: t, abilityId: TOWER_EMPTY, abilityName: "Unmitigated Explosion",
        }));
      }
    } else {
      errors.push(playerlessMinor(LW2_TOWER_RULE_ID, "Towers Unsoaked",
        `${emptyCount} Cosmic Kiss tower${emptyCount === 1 ? "" : "s"} went empty${free.length ? ` (soaking none: ${namesOf(free)})` : ""}${locked.length ? `; ${namesOf(locked)} was still locked in their limit break` : ""}, so Unmitigated Explosion hit the raid.${deathText} ${why}`,
        t, TOWER_EMPTY, "Unmitigated Explosion"));
    }
    if (lost.length >= TOWER_DEATHS) {
      errors.push(raidMarker(LW2_TOWER_RULE_ID, "Unsoaked Towers Killed the Raid",
        `${emptyCount} Cosmic Kiss tower${emptyCount === 1 ? "" : "s"} went empty and the explosions killed ${lost.length} (${joinNames(lost)}). Treated as the cutoff point.`,
        t, TOWER_EMPTY, "Unmitigated Explosion"));
    }
  }
  return errors;
}

// ── deaths with no killing blow ─────────────────────────────────────────────

/** No-killing-blow deaths that are the wipe being called, not mistakes. */
function calledWipeDeaths(players: PlayerInfo[], deaths: DeathEvent[], pullEnd: number): Set<DeathEvent> {
  const explained = (d: DeathEvent) => {
    const p = players.find((x) => x.name === d.player);
    return !!p && (!!knockedOffBy(p, d) || !!doomExpiredBefore(p, d) || !!windKnockBefore(p, d) ||
      p.damageTaken.some((e) => AVOIDABLE[e.abilityId] && e.timestamp <= d.timestamp && e.timestamp >= d.timestamp - DIED_FROM_HIT_MS));
  };
  const silent = deaths.filter((d) => !d.killingAbilityGameId && !explained(d));
  const out = new Set<DeathEvent>();
  for (const d of silent) {
    if (pullEnd - d.timestamp <= CALLED_WIPE_END_MS) out.add(d);
    const near = silent.filter((x) => Math.abs(x.timestamp - d.timestamp) <= CALLED_WIPE_WINDOW);
    if (near.length >= CALLED_WIPE_COUNT) near.forEach((x) => out.add(x));
    const pair = silent.filter((x) => Math.abs(x.timestamp - d.timestamp) <= CALLED_WIPE_PAIR_MS);
    if (pair.length >= 2) pair.forEach((x) => out.add(x));
  }
  return out;
}

/**
 * The other no-killing-blow deaths: an uncleansed Doom (player-less: the
 * cleanser isn't in the log), Walking Dead running out (player-less), a
 * Mana Burst knockback (that overlap's error) or unexplained (player-less).
 */
function detectSilentDeaths(players: PlayerInfo[], deaths: DeathEvent[], called: Set<DeathEvent>): PullError[] {
  const errors: PullError[] = [];
  for (const d of deaths) {
    if (d.killingAbilityGameId || called.has(d)) continue;
    const p = players.find((x) => x.name === d.player);
    if (!p) continue;
    const hitT = d.timestamp - DEATH_EVENT_LAG_MS;
    const doom = doomExpiredBefore(p, d);
    if (doom) {
      errors.push(playerlessMinor(LW2_DOOM_RULE_ID, "Doom Not Cleansed",
        `${p.name}'s Doom (from the dark tower's Lindwurm's Dark II) ran out after ${sec(doom.end - doom.start)}s without a cleanse, and they died. Esuna or The Warden's Paean the Doom before it runs out.`,
        doom.end, DOOM, "Doom"));
      continue;
    }
    const wd = debuffIntervals(p, WALKING_DEAD).find((w) => Math.abs(w.end - hitT) <= 500 && w.end - w.start >= WALKING_DEAD_FULL_MS);
    if (wd) {
      errors.push(playerlessMinor(LW2_FALL_RULE_ID, "Walking Dead Ran Out",
        `${p.name}'s Walking Dead (from Living Dead) expired before they were healed back to full, and they died. The healers have to heal the Walking Dead tank to full within its 10s.`,
        wd.end, WALKING_DEAD, "Walking Dead"));
      continue;
    }
    if (knockedOffBy(p, d)) continue;
    // The wind tower's knockback, aimed the wrong way (user, 2026-10-12,
    // Pull 11 of report D at 6:42).
    const wind = windKnockBefore(p, d);
    if (wind) {
      errors.push(playerError(p, {
        ruleId: LW2_FALL_RULE_ID, severity: "Major", name: "Knocked Off by the Wind Tower",
        description: `Soaked the wind tower and was knocked off the island (died ${sec(d.timestamp - DEATH_EVENT_LAG_MS - wind.timestamp)}s after its knockback). The wind tower's knockback carries you across to the other island; stand so it sends you there.`,
        timestamp: wind.timestamp, abilityId: FARAWAY_PORTENT, abilityName: "Faraway Portent",
      }));
      continue;
    }
    if (p.damageTaken.some((e) => AVOIDABLE[e.abilityId] && e.timestamp <= d.timestamp && e.timestamp >= d.timestamp - DIED_FROM_HIT_MS)) continue;
    errors.push(playerlessMinor(LW2_FALL_RULE_ID, "Died With No Killing Blow",
      `${p.name} died with no killing blow mid-pull: likely fell off the arena or an island. The log can't say what moved them.`,
      hitT, 0, "Fall"));
  }
  return errors;
}

// ── entry point ─────────────────────────────────────────────────────────────

/**
 * Lindwurm II (M12S P2) errors. Self-gates on P2's signature casts, so the
 * door boss and other fights are skipped.
 */
export function detectLindwurm2Errors(
  players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], occurrences?: ReportedOccurrence[],
): PullError[] {
  if (!enemyCasts.some((c) => SIGNATURE.includes(c.abilityId))) return [];
  const life = buildLife(players, deathEvents);
  // The pull right after a Lindwurm kill is a tactical reset: the group
  // pulls Lindwurm II and walks into the wall to get resources and cooldowns
  // back for the checkpoint. Not an error for anyone (user, 2026-10-14, A33:
  // deaths from 0:14, P2's Arcadia Aflame only at 1:37). Any death before
  // the first Arcadia Aflame marks it; a real pull has none (every pull of
  // reports A-E).
  const aflame = castsOf(enemyCasts, ARCADIA_AFLAME)[0]?.timestamp ?? Infinity;
  const early = deathEvents.filter((d) => d.timestamp - DEATH_EVENT_LAG_MS < aflame).sort((a, b) => a.timestamp - b.timestamp);
  if (early.length) {
    return [raidMarker(LW2_RESET_RULE_ID, "Checkpoint Reset",
      `${early[0].player} died before Lindwurm II's opening Arcadia Aflame: the group reset the checkpoint to get resources and cooldowns back. Not an error.`,
      early[0].timestamp - DEATH_EVENT_LAG_MS, 0, "Deaths")];
  }
  // Esoteric Finisher tests the non-tanks (staying out of it) whenever both
  // tanks hold enmity.
  for (const res of clusterByGap(hitsOf(players, life, ESOTERIC_FINISHER), (h) => h.e.timestamp, 1500)) {
    const t = res[0].e.timestamp;
    if (tanksHealthy(players, life, t - DIED_FROM_HIT_MS)) {
      occurrences?.push({ mechanicKey: LW2_FINISHER_RULE_ID, timestamp: t, players: players.filter((p) => !isTank(p) && life.hitAlive(p, t)).map((p) => p.name) });
    }
  }
  const pullEnd = Math.max(0, ...players.flatMap((p) => [...p.damageTaken, ...p.casts].map((e) => e.timestamp)), ...deathEvents.map((d) => d.timestamp));
  const called = calledWipeDeaths(players, deathEvents, pullEnd);
  const elements = detectElements(players, life, enemyCasts);
  const broken = brokenWakeWaves(enemyCasts);
  // The solo Blood Mana contact (cast-targeted Bloody Burst) tests its taker.
  const contact = castsOf(enemyCasts, BLOODY_BURST).find((c) => c.target);
  if (contact) occurrences?.push({ mechanicKey: LW2_CONTACT_RULE_ID, timestamp: contact.timestamp, players: [contact.target!] });

  const errors = [
    ...detectAvoidable(players, life, broken),
    ...elements.errors,
    ...detectContact(players, life, enemyCasts, broken),
    ...detectCones(players, life, enemyCasts),
    ...detectPersonalOverlaps(players, life, enemyCasts, deathEvents, elements.repeats),
    ...detectStacks(players, life, enemyCasts),
    ...detectMutation(players, life),
    ...detectTowers(players, life, enemyCasts, deathEvents),
    ...detectSilentDeaths(players, deathEvents, called),
  ];

  const firstRaid = () => Math.min(...errors.filter((e) => e.severity === "Raid").map((e) => e.timestamp));
  // One mechanic killing MASS_DEATHS at once with the pull over soon after.
  const mechDeaths = deathEvents.filter((d) => !NOT_A_MECHANIC.includes(d.killingAbilityGameId));
  for (const g of clusterByGap(mechDeaths, (d) => d.timestamp, MASS_DEATH_MS)) {
    const who = uniq(g.map((d) => d.player));
    if (who.length < MASS_DEATHS || pullEnd - g[0].timestamp > MASS_DEATH_END_MS) continue;
    // At the group's last fatal hit, so every victim's own error of that
    // volley sorts before it (Pull 19 of report D: the last of 8 at +0.3s).
    const t = g[g.length - 1].timestamp - DEATH_EVENT_LAG_MS;
    if (t >= firstRaid()) break;
    const nameOf = (id: number) => players.flatMap((p) => p.damageTaken).find((e) => e.abilityId === id)?.abilityName ?? `${id}`;
    const kinds = uniq(g.map((d) => nameOf(d.killingAbilityGameId)));
    errors.push(raidMarker(LW2_MASS_DEATH_RULE_ID, "Mechanic Killed the Party",
      `${who.length} players died to ${joinNames(kinds)} within ${sec(g[g.length - 1].timestamp - g[0].timestamp)}s (${joinNames(who)}). Treated as the cutoff point.`,
      t, g[0].killingAbilityGameId, kinds[0]));
    break;
  }
  const enrage = players.flatMap((p) => p.damageTaken.filter((e) => ARCADIAN_HELL_ENRAGE.includes(e.abilityId) && life.diedFrom(p, e.timestamp)))
    .sort((a, b) => a.timestamp - b.timestamp)[0];
  if (enrage && enrage.timestamp < firstRaid()) {
    errors.push(raidMarker(LW2_ENRAGE_RULE_ID, "Arcadian Hell (Enrage)",
      "The final Arcadian Hell volley killed the raid: the boss wasn't dead before the hard enrage.",
      enrage.timestamp, enrage.abilityId, "Arcadian Hell"));
  }
  const calledList = deathEvents.filter((d) => called.has(d)).sort((a, b) => a.timestamp - b.timestamp);
  const calledPair = calledList.some((d, i) => i > 0 && d.timestamp - calledList[i - 1].timestamp <= CALLED_WIPE_PAIR_MS);
  if ((calledList.length >= CALLED_WIPE_COUNT || calledPair) && calledList[0].timestamp - DEATH_EVENT_LAG_MS < firstRaid()) {
    errors.push(raidMarker(LW2_CALLED_WIPE_RULE_ID, "Wipe Called",
      `${calledList.length} players died with no killing blow together (${joinNames(uniq(calledList.map((d) => d.player)))}): the wipe was called and the raid reset.`,
      calledList[0].timestamp - DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  const outAt = (t: number) => players.filter((p) => !life.alive(p, t));
  const collapseT = life.outIntervals.map((w) => w.start).sort((a, b) => a - b)
    .find((t) => outAt(t).length >= COLLAPSE_DEAD_COUNT && pullEnd - t <= COLLAPSE_END_MS);
  if (collapseT !== undefined && collapseT + DEATH_EVENT_LAG_MS < firstRaid()) {
    const who = outAt(collapseT).map((p) => p.name);
    errors.push(raidMarker(LW2_COLLAPSE_RULE_ID, "Party Collapse",
      `${who.length} players were dead at once (${joinNames(who)}). Treated as the cutoff point.`,
      collapseT + DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
