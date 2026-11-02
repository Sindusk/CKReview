// lib/mechanics/ffxiv/dsr/sers-adelphel-grinnaux-charibert.ts
//
// -- DIGEST --
// Research model only: DSR Ultimate P1, including the FIRST prison. Extends
// the initial Terra research; no report has been inspected and no rules exist.
// Two knights must be finished together, then Charibert's HP-scaled raidwide
// must be survived. Four laser baits plus a four-player cone occur twice;
// eight tears threaten the later dash route. Chains need separation, not a
// dispel. Four pairs bait Brightwing and place delayed Skyblind explosions.
// Haurchefant's first death is scripted; saving him belongs to intermission.
// Failures: wrong AoE, overlap, tear collision/contact, missed interrupt,
// failed chain, prison exit, repeated cone bait, bad puddle, failed HP check.
// Damage Down is Major even without death; other avoidable damage is Minor
// unless it causes death/loss. Raid is a proven terminal event, not any hit.
// Community plans only: N-first/S-first lasers, role/symbol chains, HMRT and
// alternate cone rotations, mitigation/invulnerability variants are valid.
// Sections: "SCOPE AND SOURCES", "SHAPE AND CLOCK", "LOG AND SEVERITY",
// "OPENING STACK AND TETHER", "HYPERDIMENSIONAL SLASH AND TEARS",
// "SHINING BLADE AND EXECUTION", "HOLIEST HALLOWING",
// "CHAINS AND HEAVENSFLAME", "FIRST PRISON AND PURE OF HEART",
// "BRIGHTWING AND SKYBLIND", "PULL ENDERS", "STRATEGY AND NOT ERRORS",
// "OPEN QUESTIONS". Largest unknowns: tear geometry/ownership, chained
// distance, death retargets, HP-to-damage scaling and checkpoint boundaries.
// -- END DIGEST --
//
// -- SCOPE AND SOURCES --
// Ultimate only, eight players, level 90 / item-level 605 sync. Checked
// 2026-11-02. This expands the earlier guide model rather than log verification.
// [IV] Tor's Vault guide (mechanics/rotation):
// https://www.icy-veins.com/ffxiv/dragonsongs-reprise-ultimate-guide-for-the-vault-phase
// [T] Tuufless's authored Elemental guide and regional comparison:
// https://ffxiv.tuufless.com/elemental/dsr/01_the_holy_see/
// https://ffxiv.tuufless.com/mana/dsr/differences/
// [NA] Current NA reference and legacy Aether plan:
// https://naurffxiv.com/ultimate/dsr
// https://www.thepfstrat.com/u/dru
// https://ultimates.guide/dsr/
// [B] Independent game-event reference: DSW1Enums.cs, DSW1States.cs,
// HyperdimensionalSlash.cs, ShiningBlade.cs, Heavensflame.cs, PureOfHeart.cs:
// https://github.com/awgil/ffxiv_bossmod/tree/master/BossMod.Ultimate/Endwalker/Ultimate/DSW1
// [C] Ability-resolution clock, with artificial phase offsets removed:
// https://raw.githubusercontent.com/quisquous/cactbot/main/ui/raidboss/data/06-ew/ultimate/dragonsongs_reprise_ultimate.txt
// [W] Additional ability-name reference:
// https://consolegameswiki.com/wiki/Dragonsong%27s_Reprise_(Ultimate)
// Release patch 6.11 (2022-04-26):
// https://na.finalfantasyxiv.com/lodestone/topics/detail/f525c780b9abdb74c5b664f799dd16ff9de9c7b1
// Historical freezing malfunction: 7.0 launch through the server fix completed
// 2024-07-02 00:38 PDT; relevant principally to P6, not a P1 mechanic change:
// https://na.finalfantasyxiv.com/lodestone/news/detail/d6a632f3c438f8ef92954f30af4d3cb1b79af011
// No additional numerical encounter hotfix established. Modern job balance,
// gear sync and party damage change kill times, not the required solutions.
//
// -- SHAPE AND CLOCK --
// Circular starting arena; lethal perimeter. Adelphel and Grinnaux are the
// two initial targets; Charibert and Zephirin also supply mechanics. Each tank
// normally holds one knight. Defeating one starts the other's short enrage;
// balanced finishing is required, not literally simultaneous death timestamps.
// Both defeated -> prison/Charibert -> P2. Clearing the door establishes the
// only checkpoint, at P2; later phases never establish another checkpoint.
// [T] warns that someone must engage the newly appearing Thordan to preserve
// progress. Exact checkpoint activation/reset behavior remains a log question.
// [C] Approximate MM:SS from initial knight engage, EFFECT times:
// 00:10 Holiest; 00:23 donut + Bash; 00:25-28 Bladedance/Heavensblaze;
// 00:45/00:52 Slash waves; 01:00 knockback; 01:01 Holiest;
// 01:09 Execution; first interrupt just after; 01:26 knockback;
// 01:28 Heavensflame; second interrupt; 01:42 Holiest;
// 01:44 Empty OR Full Dimension; third interrupt; 02:02 Holiest;
// 02:07 Steel resolves if both still fighting. Early knight defeat can move
// the remaining knight's Steel earlier. Three Hallowings are expected only
// when the knights survive long enough; missing a later cast can be a push.
// Prison has a NEW clock: 00:00 prison/Pure cast; 00:10 spear;
// 00:16/21/26/31 Brightwing; 00:24/29/34/39 Skyblind explosions;
// 00:36 Pure of Heart. Last Skyblind can resolve AFTER Pure of Heart.
// No player-managed energy bar; the knight timer is scripted, prison starts
// on the knight objective. These source clocks are not measured thresholds.
//
// -- LOG AND SEVERITY --
// All numeric IDs here are candidate DECIMAL game actions from [B], with
// roles stated separately; FFLogs damage/cast/aura mappings are unverified.
// Status IDs are game statuses, not automatically FFLogs' aura namespace.
// A visual controller cast is not a player's damaging hit. Helper sources,
// name updates and reused abilities recur across DSR phases.
// Minor: avoidable damage without Damage Down/death. Major: attributable
// Damage Down, death or caused loss. Raid: inevitable wipe / failed route.
// A victim of a misplaced line is not automatically its owner. Damage x/y
// is the victim's position; markers, tethers, facing and object positions
// may be absent. Fault stays unknown when the necessary evidence is absent.
// Expected vulnerability auras from intended hits are not mistakes. Subsequent
// deaths caused by one earlier mistake are consequences, not new offenders.
// A deliberate wall after Damage Down or a called wipe is a recovery/reset
// choice; record the original avoidable hit, not a second positioning error.
//
// -- OPENING STACK AND TETHER --
// What: Holiest of Holy 25300, 4s cast/raid damage. Grinnaux's Empty Dimension
// 25306 is a 5s donut with candidate inner radius 6y. Later Full Dimension
// 25307 is the opposite 6y point-blank circle; it is a real random branch.
// Holy Shield Bash 25297 is the charge to a transferable tether; helper
// 25579 is a related visual/effect. Down for the Count prevents movement.
// Holy Bladedance controller 25298; actual cleave 25299 is described by [B]
// as six hits, 90-degree cone, range 16y. Heavensblaze 25309 is the separate
// Charibert shared fire hit, candidate radius 4y, NOT Heavensflame spread.
// Correct: keep bosses together for cleave damage; party inside donut on one
// side, intercepted tether isolated on the other. Lengthen Bash's travel to
// reduce damage without leaving donut. Buster tank mitigates or invulns;
// everyone available except that tank shares Heavensblaze, normally seven.
// Failure: untaken tether / cross-party charge -> LOG SIGNAL: Bash target,
// extra charge or Bladedance recipients, stun and deaths; FAULT: interceptor
// only with a known duty or demonstrably bad bait, otherwise unknown;
// CONSEQUENCE: Major for caused death, Raid if terminal collapse.
// Failure: wrong in/out -> LOG SIGNAL: Dimension damage, Damage Down/death;
// FAULT: mover unless displacement caused it; CONSEQUENCE: Minor, or Major
// with Damage Down/death. Failure: failed share -> LOG SIGNAL: small stack
// and lethal Heavensblaze; FAULT: absent helper only if their duty is known.
// Removal: stun/resistance expire; Bash tether resolves on attack. A missing
// tether after a death is not proof of a successful intercept. Not errors:
// normal raidwide, six buster ticks, intended shared fire and invulnerability.
//
// -- HYPERDIMENSIONAL SLASH AND TEARS --
// What: controller 25302 / second controller 25365; four marked line hits
// 25303 (candidate width 8y), while four others share a 120-degree cone
// 25582. The second set reverses the marked/unmarked groups. Thus eight
// intended line recipients, two separate cone shares, eight Aetherial Tears.
// Both line and cone inflict Magic Vulnerability Up; taking two is lethal.
// Each line reaches the wall, creating a tear there. Tears remain through
// Adelphel's route. Dimensional Torsion 25304 punishes nearby players;
// Dimensional Purgation 25305 is the tear collision/raid penalty candidate.
// Two tears too close, or a tear linking to a later Brightsphere, can wipe.
// Correct: marked players use four separated angles on one half, unmarked
// share opposite; swap halves next set. Bait between cardinal dash routes,
// not on a cardinal. Conga order resolves which marked player uses each ray.
// Geometry: [B] models contact/link danger around 9y but explicitly questions
// the exact tear threshold. Arena floor diamonds/waymarks are strat aids,
// not universal logged coordinates or a verified tolerance.
// Failure: doubled line/cone -> LOG SIGNAL: two effect hits in one wave,
// vulnerability/death; FAULT: misplaced ray/bait or intruding player if
// positions establish it, otherwise unknown; CONSEQUENCE: Major on death.
// Failure: tear contact -> LOG SIGNAL: Torsion and Damage Down/death;
// FAULT: approaching player unless forced there; CONSEQUENCE: Major with
// Damage Down/death. Failure: tear collision -> LOG SIGNAL: Purgation and
// raid deaths; FAULT: known bad placement, else player-less; CONSEQUENCE:
// Raid when terminal. The later orb explosion is fallout of that placement.
// Removal: marks resolve; vulnerability expires. Tears are environmental
// hazards until phase cleanup, not player debuffs to dispel. Not errors:
// one line per marked player, the opposite four-player cone, all eight tears.
//
// -- SHINING BLADE AND EXECUTION --
// What: Adelphel reappears at a cardinal; Holiest and Grinnaux's Faith
// Unmoving overlap. Faith 25308 knocks back ~16y from GRINNAUX, not Adelphel.
// Shining Blade 25294 is the dash hit (candidate width 6y). Bright Flare
// 25295 is a separate ~9y orb explosion. Adelphel's three-leg zigzag uses
// cardinal endpoints; his first lateral movement identifies the safe route.
// Execution 25301 then lands on his enmity holder, candidate radius 5y.
// Correct: begin opposite Adelphel, use immunity or control the knockback,
// follow the first lateral dash to the floor-arrow safe point. His tank
// continues away from the party for Execution. Maintain distance from tears.
// Failure: dash/orb hit -> LOG SIGNAL: Blade/Flare damage and death;
// FAULT: hit player unless forced or route blocked by earlier bad tear;
// CONSEQUENCE: Major if killed. Failure: Execution splash -> LOG SIGNAL:
// extra victims/knockback/deaths; FAULT: tank if they landed on the raid,
// otherwise an intruder if proven; CONSEQUENCE: Major, possibly Raid.
// Failure: knockback into perimeter -> LOG SIGNAL: Faith then wall death,
// possibly no killing ability; FAULT: incorrect starting position/immunity
// timing if established; CONSEQUENCE: Major. [B] gives unverified geometry,
// not evidence that any character crossing a drawn safe point was at fault.
// Removal: knockback is instantaneous; orb actors explode and disappear.
// Not errors: Holiest/knockback damage, isolated Execution, a planned invuln.
//
// -- HOLIEST HALLOWING --
// What: 25296, interruptible 4s cast; successful completion heals the knights
// substantially (guides say 50% HP). Three opportunities in the full script.
// Correct: interrupt each; NA example Adelphel tank -> physical ranged ->
// Adelphel tank. Other ranged/tank rotations are equally valid.
// Failure: missed interrupt -> LOG SIGNAL: completed heal and enemy HP gain,
// rather than just a begincast; FAULT: no known interrupt assignment in this
// research, so unknown; CONSEQUENCE: Raid only if it makes the timer
// unrecoverable; attributable Major if a known omission causes loss.
// Removal: interrupted/canceled cast is success; death/phase transition can
// also cancel it. An interrupt button press without completion evidence
// does not prove it landed. Not errors: its cast starting, a late successful
// interrupt, no third cast after the knights have been finished.
//
// -- CHAINS AND HEAVENSFLAME --
// What: four symbol pairs and Burning Chains (game status 769 candidate):
// circle = DPS/DPS; cross = tank/healer; triangle = healer/DPS;
// square = tank/DPS. Grinnaux knocks back, then all eight receive a ~10y
// Heavensflame spread (25310 controller, 25311 damage). Failed chain penalty
// candidate Holy Chain 25312; Fire Resistance Down II makes overlap lethal.
// Correct: start close, take opposite radial knockbacks, then keep moving
// outward enough to break chains before the flame/chain deadline. [T] says
// breaking depends on added distance from the starting length; [B]'s ~32y
// absolute model is provisional. Initial separation can make a chain harder.
// Failure: unbroken chain -> LOG SIGNAL: Holy Chain damage/Damage Down or
// persistent chain through deadline; FAULT: pair only, unless one mover's
// mistake is established; CONSEQUENCE: Major with Damage Down/death.
// Failure: spread overlap -> LOG SIGNAL: extra flame hits under resistance
// down; FAULT: misplaced player only if distinct from their victim;
// CONSEQUENCE: Major on death, Raid if cascade is unrecoverable.
// Removal: separation breaks tether; death cleanup is not a successful break.
// The normal plan rides this knockback. Immunity is valid only with an
// alternate movement solution that still breaks chains and clears spreads.
// Not errors: each player's own flame, ordinary knockback, chain removal.
//
// -- FIRST PRISON AND PURE OF HEART --
// What: Planar Prison 25313 pulls/stuns party into a small west-side ring;
// boundary damage candidate 25580, distinct from harmless initial pull damage.
// Planar Imprisonment confines everyone. Charibert channels Pure of Heart
// 25316 ~35.5-36s while targetable; outgoing damage scales with remaining HP.
// Spear of the Fury 25314 strikes Haurchefant at ~00:10. Shockwave 25315
// pulses while he resists; his death in this FIRST history is unavoidable.
// Correct: remain inside, attack Charibert, heal and mitigate Pure. Guides'
// ~30% HP goal is a practical survival target, not a verified binary check.
// Failure: prison exit -> LOG SIGNAL: boundary damage/death outside ring;
// FAULT: mover or prior knockback cause; CONSEQUENCE: Major. Failure: Pure
// lethal -> LOG SIGNAL: high remaining boss HP, Pure damage/raid deaths;
// FAULT: group DPS/mitigation/healing unless a root cause is known;
// CONSEQUENCE: Raid if terminal. An HP-scaled hit need not have a unique
// failure ID. Removal: prison ends with script; neither a normal dispel nor
// an obligation to heal the first-history NPC. Not errors: prison pull,
// Shockwave, Pure, Haurchefant's scripted death, living Charibert at low HP.
//
// -- BRIGHTWING AND SKYBLIND --
// What: Brightwing 25369 from helpers, TWO nearest baits to Charibert per
// wave, four waves 5s apart. Two cones need separate aim, not a two-person
// split stack. Each intended victim gains Light Resistance Down and Skyblind
// (status candidate 2661). Skyblind expires to place a small ground attack;
// its separate 25370 explosion is ~8s after Brightwing. [B] supplies a 2.5s
// ground cast / ~3y radius. The old "5s later" described placement, not hit.
// Correct: next pair becomes nearest while previous pair moves to assigned
// drop side, then leaves the puddle snapshot. Keep later cones off the raid.
// Failure: repeated bait -> LOG SIGNAL: second Brightwing while resistant;
// FAULT: wrong nearest positioning or late departing pair when established;
// CONSEQUENCE: Major on death. Failure: clipped cone / bad drop -> LOG
// SIGNAL: additional cone recipients or Skyblind hit/Damage Down/death;
// FAULT: owner if objectively misplaced, otherwise intruder/unknown;
// CONSEQUENCE: Minor, escalates to Major with Damage Down/death.
// Removal: Skyblind expiry is intended placement; death-time removal/early
// trigger and target substitution are unestablished. Not errors: eight
// intended Brightwing hits and eight placed circles; last tank drop after Pure.
//
// -- PULL ENDERS --
// Brightblade's Steel 25292 / The Bull's Steel 25293: 3s enrage casts,
// healing, invulnerability and damage increase; completing is the terminal
// knight check. A cast starting after the other knight falls is still a
// short finishing window, not proof of failure. Purgation, lethal Pure or
// unrecoverable prison/chain collapse also end pulls. A single Damage Down
// or a missed interrupt alone does not establish an inevitable wipe.
//
// -- STRATEGY AND NOT ERRORS --
// NA/Aether: marked Slash north first, then south; conga determines rays.
// Elemental: south first, then north. Inner uptime waymarks demand tighter
// angular separation; outer markers trade uptime for tolerance. Both valid.
// Common role PS spots (relative true north): DPS triangle NW, tank cross N,
// tank square NE, DPS circles W/E, DPS square SW, healer cross S, healer
// triangle SE. Mana reverses triangle role positions. Circle DPS priority
// may be M1>M2>R1>R2 west-to-east, but none is assigned to this user's group.
// HMRT = healer pair -> melee -> ranged -> tanks; NA often alternates E/W
// drops. Elemental uses fixed drop sides by role with front/back movement.
// Earlier TMRH/other rotations are valid if every pair baits once and clears
// each delayed drop. Literal compass directions depend on boss-relative
// versus true-north convention. Tank identities and invuln use vary.
// Normal autos on knight tanks, shared damage, debuff application, phase
// holds, scripted NPC death and successful mechanic removals are expected.
//
// -- OPEN QUESTIONS --
// 1. Verify all candidate action/aura IDs in a kill plus knight, tear, chain
//    and prison wipes; are helpers labeled consistently across the checkpoint?
// 2. What exact tear-player/tear-tear/tear-orb distances trigger penalties,
//    and which tear/drop positions or marker owners are available in FFLogs?
// 3. Does chain break use starting-length growth, an absolute threshold, or
//    both? What is the actual deadline relative to Heavensflame snapshots?
// 4. What are Pure's HP scaling and current survival range; which Shockwave
//    and NPC events distinguish first prison from rewind or failed loops?
// 5. What happens to cones, spreads, Skyblind and tethers when a target dies?
//    Which replacements are visible, rather than inferred from extra damage?
// 6. Verify interrupt/heal events, early knight-defeat Steel delay, and the
//    precise checkpoint activation. No static assignments or own logs supplied.
