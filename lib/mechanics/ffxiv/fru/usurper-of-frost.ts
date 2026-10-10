// lib/mechanics/ffxiv/fru/usurper-of-frost.ts
//
// -- GUIDE-DERIVED MODEL: USURPER OF FROST (FRU PHASE 2) --
// Futures Rewritten (Ultimate), patch 7.11 origin; checked 2026-10-09.
// Comments only. No real report analyzed: all log signals, tolerances and
// attribution below are hypotheses, not VERIFIED AGAINST LOGS findings.
// Owns Shiva AND the crystal intermission before oracle-of-darkness.ts.
// Shared severity, role aliases and regional-preset contract: fatebreaker.ts.
// Damage Down/Mark of Mortality from a proven mistake is Major; terminal
// loss is Raid. Clipped victims and reset fallout are not automatic fault.
//
// -- SOURCES AND PATCH SENSITIVITY --
// [N] Original NAUR explanation by Tvnariea Reksane:
//     https://naurffxiv.com/ultimate/fru/guide/p2
// [NI] https://naurffxiv.com/ultimate/fru/guide/intermission
// [S] Current NAUR slides linked by WTFDIG; all 36 inspected:
//     https://tinyurl.com/lesbin-p2
// [W] https://wtfdig.info/ultimates/fru#naur
// [L] LPDU's own assignments and original diagrams:
//     https://lpdu.net/fru/p2/
//     https://raidplan.io/plan/mi0w4jnkggWnOTDT
//     https://raidplan.io/plan/VI5eMECB1_yN4u8G
//     https://raidplan.io/plan/5HlBHfcjcqn2TjpY
// [M] Original MUR diagrams; D1/D2=M1/M2, D3/D4=R1/R2, ST=OT:
//     https://raidplan.io/plan/PPYgcTqAr4DXZE50
//     https://raidplan.io/plan/h521rrvlPhF-ajjp
//     https://raidplan.io/plan/gFwpXMjpVgxgcnpi
// [ML] MUR Light Rampant by Popi, updated Em:
//      https://raidplan.io/plan/pgz322Znkd_Srn8n
// [I] Tor's original mechanical explanation:
//     https://www.icy-veins.com/ffxiv/futures-rewritten-ultimate-guide-for-phase-2-usurper-of-frost
// [T] Original timeline by A'rhaeda Vhil:
//     https://thaliak.com/ultimates/fru/
// [C] Original Cactbot action annotations, candidate game IDs only:
//     https://github.com/OverlayPlugin/cactbot/blob/main/ui/raidboss/data/07-dt/ultimate/futures_rewritten.txt
// No confirmed mechanic-changing hotfix found. Current assignment diagrams
// matter: archived clocks Light Rampant differs from current 4/4 version.
// N says four Hammer drops in one paragraph; S/I and ML show FIVE. The
// five-drop model is used here. S allows a Hammer clip outside tower timing;
// N warns its magic vuln makes a simultaneous tower lethal. Both can hold.
//
// -- SHAPE, ACTORS, CLOCK AND PHASE GATES --
// P1 defeat starts this phase; early P1 kills shift whole-pull timestamps.
// Circular arena retains deathwall. Usurper, Oracle's Reflection, Frozen
// Mirrors and Holy Lights are distinct mechanic sources, not killable adds.
// Approximate phase-relative damage order [T], not universal pull offsets:
// 00:11/15 Slap; 00:32 Dust; 00:41 Kick; 00:43 Stone; 00:47 knockback;
// 00:51-56 four Holy; 01:00 gaze; 01:06/08 twins; 01:19 Ray;
// 01:29 Mirrors; 01:43 blue; 01:53 red; 01:59 Banish;
// 02:09 Rampant; 02:20 six towers; 02:26 stacks; 02:35 center tower;
// 02:38 Banish; 02:47 House; 03:06 Absolute Zero; 03:08 knockback.
// Shiva must be BELOW 20% at Absolute Zero completion, not killed early.
// Passing gives normal raid damage; failing gives lethal enrage (Raid).
// Swelling Frost pushes outward; Deep Freeze prevents action ~16-17s.
// Freeze/DoT is expected. Walling from a bad knockback start is Major.
// Crystal spawn starts the next independent clock; Endless Ice Age is
// roughly a 44s deadline. Ice Veil destruction advances to P3; no checkpoint.
//
// -- QUADRUPLE SLAP AND MIRROR IMAGE [N] --
// Two physical buster hits despite name, ~4s apart, with cleansable 25s
// Physical Vulnerability Up. Swap, cleanse or invulnerability is valid.
// Following auto also threatens a still-vulnerable tank. Mirror Image
// summons the center light-form Reflection; it is not damage to flag.
// Failure: second hit/auto without protection -> LOG: death under physical
//   vuln; FAULT: assigned swap/cleanse controller if intent is established;
//   CONSEQUENCE: Major. Absence of a swap is not itself evidence of fault.
// Removal: Esuna/Warden's Paean cleanse is intended; expiry/death is not
// proof of a cleanse, and no delayed explosion is described for this aura.
// Not errors: mitigated busters, normal autos and successful solo invuln.
//
// -- DIAMOND DUST: CIRCLES, KICK, STONE, CONES [I, S] --
// Raidwide followed by untargetable sequence. Eight circles resolve 2/4/2:
// first opposite directions, second the other cardinal/intercardinal set,
// last remaining opposite directions 90 degrees from first. All avoidable.
// Axe Kick is large point-blank (out); Scythe Kick donut has only the tiny
// center star safe, substantially inside inner floor ring. Simultaneously
// four players of one role receive Frigid Stone circles/starburst needles;
// other four nearest bait The House of Light cones. No doubled cone baits.
// NAUR/LPDU color-partner swap: unmarked use first-circle directions,
// marked use alternate cardinal/intercardinal within own color quadrant.
// For Scythe, cone players nearest center, marked slightly farther but
// still in tiny safe area; marked then run out to place stars and return.
// For Axe, cones just beyond outer ring, marked at wall; move in promptly.
// Heavenly Strike knockback sends G1 into cleared red/purple first-circle
// sector, G2 yellow/blue; stars constrain paths. Knockback resistance is
// not a substitute for the mechanic's required travel unless verified.
// MUR publishes color partners and Relative North as valid alternatives;
// rotations of the same safe pattern need not imply a different mechanic.
// Failure: circle/Kick/needle clip -> LOG: respective damage + Damage Down
//   or death; FAULT: mover, unless another player's bad Stone placement
//   created the ray; CONSEQUENCE: Major when established.
// Failure: wrong nearest cones -> LOG: doubled cone hits or missing marked
//   exclusion; FAULT: too-close marked player/bait if geometry proves it;
//   CONSEQUENCE: Major on penalty/death. Victim coordinates alone do not
//   prove who aimed the cone.
// Not errors: Dust raidwide, four Stone drops, four correct cone hits,
// knockback and temporary movement into an omen before its resolution.
//
// -- FOUR SINBOUND HOLY, GAZE AND TWIN CLEAVES [L, I] --
// Four consecutive healer-targeted four-player stacks leave Bleeding
// puddles. Stay together and move after each. NAUR rotates away from inner
// light-form Shiva; cursed pattern (Shiva at party's landing) both CW,
// party moving toward her crosses before twins. LPDU defaults CW except
// party with inner Shiva one marker CW rotates CCW. Both are valid paths.
// Outside ice-form Usurper's Shining Armor gaze inflicts Damage Down/Stun.
// Look away; floor gains Thin Ice, causing a long slide on movement.
// Forms swap: the previously inner light Reflection becomes ice caster.
// Twin Stillness: behind safe then front safe (270-front then 90-back).
// Twin Silence: front safe then behind safe, reverse order. Start earlier
// for long Stillness slide; second cleave follows first very quickly.
// Hallowed Ray is a random-target eight-player line stack after ice ends.
// Early direction snapshot can let its target dodge; count alone is not
// proof of a missing helper. Party stacks in the line and mitigates.
// Failure: small Holy/Ray stack -> LOG: abnormal split hit/death or stack
//   penalty; FAULT: missing living assigned helper if measured, otherwise
//   unknown; CONSEQUENCE: Minor escalating to Major/Raid.
// Failure: gaze -> LOG: Shining Armor + Damage Down/Stun; FAULT: facing
//   player if captured; CONSEQUENCE: Major, often terminal twin cascade.
// Failure: puddle/twin/wall -> LOG: Bleeding tick, twin damage or wall death;
//   FAULT: mover/bad party path if established; CONSEQUENCE: Minor puddle
//   damage without penalty, Major death; Raid for unrecoverable losses.
// Removal: Thin Ice ends with sequence; Stun expires, Bleeding clears on
// leaving puddle/expiry. No death-triggered Holy explosion is documented.
// Not errors: correct Holy/Ray hits, gaze avoidance downtime, valid slides.
//
// -- MIRROR, MIRROR AND BANISH III [M, S] --
// Three mirrors: two red 90 degrees apart, one blue anywhere. Boss/blue
// Scythe Kick + four nearest cones each resolve simultaneously, then both
// red Reflected Scythe Kicks repeat: eight cone recipients per volley.
// NAUR/LPDU: tank pulls boss opposite blue; T/M near boss, H/R near blue.
// MUR strategy summary instead says supports far/DPS close; its linked
// mirror plan and long guide use T/M vs H/R. This source disagreement is
// retained as TWO plausible MUR presets, not a confirmed region-wide rule.
// Move each group to nearest red, tie CW. Supports outside, DPS middle;
// angle rays so the opposite group is not clipped. Mirrors then despawn.
// Banish III: one halo orb -> four pairs; four orbs -> eight spreads.
// Partner slots MT/R1, OT/R2, H1/M1, H2/M2; group orientation rotates with
// mirror. Halo is visual; cast/damage IDs may distinguish branch in logs.
// Failure: wrong mirror/bait/overlap -> LOG: reflected donut/cone damage,
//   multiple magic-vuln hits or Damage Down; FAULT: misplaced aimer when
//   source ray is known; CONSEQUENCE: Major, Raid if group dies.
// Failure: Banish overlap/missing partner -> LOG: doubled damage or small
//   split stack/penalty; FAULT: assigned mover with branch evidence;
//   CONSEQUENCE: Major on penalty/death. Different valid group is normal.
// Not errors: two expected cone volleys and correct Banish resolution.
//
// -- LIGHT RAMPANT: SIX TOWERS, TWO PUDDLES [N, ML, S] --
// Raidwide assigns six chained players, two pink puddle players, two golden
// Weight of Light marks on connected chain players. Chains of Everlasting
// Light ~10s becomes Curse of Everlasting Light ~9s: minimum tether distance
// required; no maximum. Crossing lines alone does not prove failure.
// Towers form fixed N/NW/NE/S/SW/SE hexagon; exactly one tethered soaker
// each. Two pink players drop FIVE Luminous Hammers each, towers coinciding
// with drop three. Hammer magic vuln makes a simultaneous tower dangerous.
// NAUR initial arc: supports N, DPS S, H/R W, T/M E. After excluding pink,
// 3/3 stays; 2 supports means R1 rotates CW to N; 4 means OT rotates CW to
// S. Make hexagon, swap N/S and NW/NE, then move out to assigned towers.
// NAUR pink nearest E/W, tie CW; drop 1-3 inward, turn LEFT ~90 degrees
// toward CW cardinal for 4-5. W pink joins N, E pink joins S.
// LPDU/MUR initial lineup N H1,H2,MT,OT / S R1,R2,M1,M2 (W->E), then
// same star swaps. Their pinks start N/S and travel CW instead of NAUR E/W.
// LPDU same-half pinks: more-CW player takes other half. Tower possibilities
// recorded by L: R1 4/2; R2 A/4; M1 A/3/4; M2 A/3; H1 2/C;
// H2 2/C/1; MT 1/C; OT 1/3. These are marker labels, not FFLogs coordinates.
// Failure: missed tower -> LOG: Bright Hunger penalty + raid Damage Down;
//   FAULT: assigned missing soaker with demand evidence; CONSEQUENCE: Major
//   or Raid if recovery is impossible. Six successful soaks are normal.
// Failure: active tether too short -> LOG: curse explosion/raid deaths;
//   FAULT: misplaced endpoint if both positions and adjacency are known;
//   CONSEQUENCE: Major and Raid; no automatic blame to both endpoints.
// Failure: puddle/tower overlap -> LOG: Hammer then tower under magic vuln;
//   FAULT: dropper or displaced soaker if trajectory proves it;
//   CONSEQUENCE: Major on death. S permits benign non-tower Hammer clips.
// Removal: chain expiry activates curse, not successful completion; curse
// expires after its distance window. Death/early removal effects unverified.
//
// -- LIGHT RAMPANT: STACK ACCOUNTING AND ORBS [N, I] --
// Lightsteeped budget 32: initial six + first towers six + Powerful Light
// eight + center tower four + final House of Light eight = four per player.
// Initial pinks have 1/2, tethered players 0/1. Fifth stack explodes nearby.
// Six Holy Lights explode in two triangle waves of three. Golden Powerful
// Light requires two groups of four, adds one stack each, before first
// Burst. Fewer than four gives Mark of Mortality. Stay grouped during dodge.
// NAUR fast group (orb on N/S) starts three wall-notches CW, slow on card;
// rotate CW then dodge into expired first orbs. Actual omen decides timing.
// Four players with TWO stacks soak center tower; three-stack players stay
// out. Banish pairs/spreads then eight House of Light cones add final stack.
// Failure: stack short -> LOG: Powerful Light + Mark of Mortality; FAULT:
//   absent assigned helper if proven; CONSEQUENCE: Major/Raid.
// Failure: wrong center soaker/extra cone -> LOG: five Lightsteeped stacks
//   plus explosion; FAULT: extra soaker/overlap controller when established;
//   CONSEQUENCE: Major and usually Raid. Prior bad stack can be root cause.
// Failure: Burst/puddle -> LOG: avoidable damage + penalty/DoT/death;
//   FAULT: mover unless dropped hazard obstructed assigned lane;
//   CONSEQUENCE: Minor without penalty, Major with Damage Down/death.
// Removal: final four stacks expire harmlessly during intermission. Removing
// a status on death does not establish either a fifth-stack explosion or
// a successful cleanse. Expected towers/stacks/cones are not errors.
//
// -- INTERMISSION: EIGHT CRYSTALS AND ICE VEIL [NI, L] --
// Four Light crystals outer cardinals, four Dark inner intercardinals.
// Ice Veil begins Endless Ice Age with Invincibility. T/M bait nearest
// Light Hiemal Storm circles and take passable tethers; H/R aim nearest
// Dark Sinbound Blizzard cones outward BETWEEN Light crystals. Second
// circle wave assigns tethers, after third come three Hiemal Ray puddles.
// T/M kite puddles clear of ranged; H/R help clockwise Light first.
// Dark cone hitting Light grants permanent Vulnerability Down making it
// invulnerable. A cone can also protect Dark/Veil (80% reduction).
// CLEAR ROUTE: kill only four Light, preserve all Dark; Veil becomes
// vulnerable with 50% reduction. Bring below 50% but allow Gaia's late
// hammer to finish it. Hammer removes half max HP and preserves Eternal
// Ice Fragment; its absorption is the prerequisite for P5.
// Killing Dark or finishing Veil before hammer can still lead to P3/P4,
// but loses clear route. Killing all adds deliberately is valid prog;
// establish clear/prog intent before treating that decision as an error.
// Caster LB3 normally kills Dark, but deliberate cone-protection of ALL
// four makes it a documented valid advanced alternative. Melee LB is valid.
// Failure: cone protects Light -> LOG: enemy Vulnerability Down then stalled
//   crystal kill; FAULT: nearest cone aimer if source/positions establish it;
//   CONSEQUENCE: Major; Raid at inevitable deadline, not merely on low DPS.
// Failure: wrong crystal/early Veil kill -> LOG: Dark death or Veil death
//   preceding Gaia hammer, fragment failure; FAULT: lethal attacker/cleave
//   controller if clear intent and causality proven; CONSEQUENCE: Major,
//   Raid for clear objective, though prog can continue for several minutes.
// Failure: Veil survives deadline -> LOG: Endless Ice Age completion;
//   FAULT: unknown absent a specific preceding mistake; CONSEQUENCE: Raid.
// Not errors: nearest crystal hits, intended four Light deaths, hammer,
// freeze, cone-protected caster LB and deliberate progression shortcut.
//
// -- STRATEGY OBSERVABILITY AND LOG-VERIFICATION QUESTIONS --
// C candidate damage hex: 9D16 Inescapable Illumination (fifth-stack
// penalty annotated with '?'); 9D17 Refulgent Fate (chain penalty);
// 9D1E Banish pair, 9D1F Banish III Divided spread. Penalty scope and
// FFLogs numeric mapping require verification; repeated names span phases.
// 1. Can Stone/cone hit positions identify color partners vs Relative North
//    on multiple successful patterns? Symmetric patterns can be ambiguous.
// 2. Are initial LR role positions, star tower recipients and pink drop
//    trajectories captured well enough to distinguish NAUR E/W vs N/S?
//    Some tower allocations coincide; does Strategy preserve uncertainty?
// 3. Resolve MUR mirror summary/diagram disagreement with user/log evidence;
//    T/M-H/R geometry alone cannot identify a regional preset. Mixed plans
//    and LPDU/NAUR shared submechanics are valid, independently selectable.
// 4. Establish action/status IDs for each Kick, reflected cone, Stone,
//    needle, Hammer, Bright Hunger, Powerful Light, Burst, Banish branch,
//    fifth-stack/curse penalty, crystal hit and Endless Ice Age. Identify
//    actual FFLogs aura duration/removal semantics and death cascades.
// 5. Verify Hammer count/vuln snapshot, tower demand visibility, relative
//    clocks, ice-slide endpoint/facing coverage and exact safe tolerances.
//    Does gaze facing exist in captured data, or only damage/status?
// 6. Can fragment preservation be inferred from enemy buffs/hammer events,
//    rather than animation? Which event first proves irreversible loss of
//    P5, and can clear/prog intent be supplied without blaming a prog LB?
