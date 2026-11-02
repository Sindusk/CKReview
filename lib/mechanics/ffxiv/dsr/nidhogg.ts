// lib/mechanics/ffxiv/dsr/nidhogg.ts
//
// -- DIGEST --
// DSR Ultimate P3 research only, extending the initial Terra model. Nidhogg
// arrives with Final Chorus; Dive from Grace assigns 3 first / 2 second /
// 3 third jumps. Eight drops become eight single-soak towers; eight follow-up
// nearest-player Geirskoguls. Two Eye stacks and two in/out pairs overlap.
// Then Drachenlance, four enumerated towers totaling eight occupants,
// three Geirskoguls plus two transferable Soul Tethers, another Lance/enrage.
// Distinguish jump, tower damage, tower FAIL 26395, wheel hits and line hits.
// Arrow displacement is described as ~14-15y in independent sources, NOT
// the draft's 10y; exact distance and facing snapshots need log verification.
// Westhogg/Easthogg and tank/movement plans vary. No static assignments.
// Expected jumps/towers/stacks/busters never count as avoidable hits.
// Damage Down is Major; Raid requires terminal outcome, not a generic death.
// Sections: "SCOPE AND SOURCES", "SHAPE AND CLOCK", "LOG AND SEVERITY",
// "FINAL CHORUS AND AUTO CLEAVES", "DIVE FROM GRACE: ASSIGNMENTS AND DROPS",
// "DARKDRAGON DIVE AND GEIRSKOGUL", "EYE OF THE TYRANT AND WHEELS",
// "DRACHENLANCE", "ENUMERATED TOWERS", "SOUL TETHERS",
// "PULL ENDERS", "STRATEGY AND NOT ERRORS", "OPEN QUESTIONS".
// Main unknowns: report aura/facing access, actual tower occupancy rules,
// target death effects, source-owned tower/line positions and enrage timing.
// -- END DIGEST --
//
// -- SCOPE AND SOURCES --
// Ultimate only. Checked 2026-11-02. No log-verified claims or detector code.
// [IV] https://www.icy-veins.com/ffxiv/dragonsongs-reprise-ultimate-guide-for-nidhogg
// [T] https://ffxiv.tuufless.com/elemental/dsr/03_nidhogg/
// [R] https://ffxiv.tuufless.com/mana/dsr/differences/
// [NA] https://naurffxiv.com/ultimate/dsr
// [APD] https://ultimates.guide/dsr/
// Legacy East/West variants: https://www.thepfstrat.com/u/dru
// [TR] Authored trigger explanation, useful for alternative assignments:
// https://triggevent.io/pages/Dragonsong-Triggers/
// [B] DSW2Enums.cs, DSW2States.cs, P3DiveFromGrace.cs and
// P3DarkdragonDiveCounter.cs, independent event/geometry reference:
// https://github.com/awgil/ffxiv_bossmod/tree/master/BossMod.Ultimate/Endwalker/Ultimate/DSW2
// [C] https://raw.githubusercontent.com/quisquous/cactbot/main/ui/raidboss/data/06-ew/ultimate/dragonsongs_reprise_ultimate.txt
// [W] https://consolegameswiki.com/wiki/Dragonsong%27s_Reprise_(Ultimate)
// Released 6.11, 2022-04-26. No P3 numerical hotfix established. Official
// release/freezing-fix links in P1; the historical 7.0 issue chiefly affects
// P6. Modern damage can skip late Lance/enrage; no exact current DPS cutoff
// established here. Geometry/clock disagreement is listed under questions.
//
// -- SHAPE AND CLOCK --
// Square arena with lethal perimeter, centered mostly stationary Nidhogg,
// rotating to enmity/selected targets. Clones are mechanic actors, not adds
// to kill. No intermediate checkpoint. Defeat Nidhogg to start the Eyes.
// Timed phase script; P2 kill time changes absolute whole-pull timestamps.
// [C] Approximate EFFECT clock, 00:00 = Final Chorus damage/targetability:
// 00:18 Dive from Grace; 00:28 first jumps + first Eye/in-out controller;
// 00:35 first three towers; 00:38 second jumps; 00:42 first Geirskoguls;
// 00:45 second two towers; 00:49 third jumps + second Eye/controller;
// 00:52 second Geirskoguls; 00:56 last three towers; 01:03 last lines;
// 01:08 first Drachenlance; ~01:11 four tower telegraphs;
// 01:15 enumerated towers; 01:22 Soul Tethers + three Geirskoguls;
// 01:46 second Drachenlance; 01:59 Revenge of the Horde completes.
// [C] tower telegraph time is explicitly approximate. Each jump's tower HIT
// is about 6.5-6.6s after its jump, not 1.5s afterward. [B] describes a later
// 2.5s tower cast within that delay. Cast start, tower appearance, jump hit
// and tower hit are different instants; these are not measured log windows.
//
// -- LOG AND SEVERITY --
// DECIMAL candidate game action/status IDs from [B]; no FFLogs GUID mapping
// is established. IDs with the same display name can encode different roles.
// First/Second/Third in Line status candidates 3004/3005/3006 and jump-type
// statuses 2755/2756/2757 may expose duties even if headmarkers do not.
// Damage Down is described by guides as 50% for 180s. Attributable Damage
// Down is Major even alive; other avoidable damage is Minor until it causes
// death/loss. Raid requires an inevitable wipe, often a failed tower cascade.
// Missing damage events cannot alone prove a missed soak: immunity, shields,
// dead targets, helper visibility and effect batching need report checks.
// Player damage positions are victims' positions. A clone's line aim, a
// player's facing, tower marker count and raid-assigned slot may be absent.
// Own jump damage and intended tower resistance debuffs are expected.
// A later missing soaker after someone died earlier is causal fallout.
//
// -- FINAL CHORUS AND AUTO CLEAVES --
// What: Final Chorus visual 26376, actual raid hit 26377. Nidhogg is not
// targetable early enough for all enemy debuff mitigation; party mitigation
// can be applied beforehand. Auto 26416 is a long narrow line through his
// enmity target (candidate full width 6y), not a harmless single-target auto.
// Correct: heal/mitigate transition, keep non-tanks away from the MT's line.
// MT re-establishes safe facing when autos resume after jump choreography.
// Failure: auto clips party -> LOG SIGNAL: 26416 non-primary victims/deaths;
// FAULT: tank's wrong facing or intruder if geometry proves it, otherwise
// unknown; CONSEQUENCE: Major on death, Minor without death/Damage Down.
// Failure: transition deaths -> LOG SIGNAL: Final Chorus deaths; FAULT:
// prior damage or group mitigation/healing, not automatically one healer;
// CONSEQUENCE: Raid only if continuation becomes impossible. Removal:
// normal buffs/temporary mitigation expire. Not errors: expected tank autos,
// transition damage, temporary boss facing during forced mechanic casts.
//
// -- DIVE FROM GRACE: ASSIGNMENTS AND DROPS --
// What: 26381, 5s controller cast. Three First in Line, two Second, three
// Third; numbers determine JUMP order, not a tower's required headcount.
// Each gets High Jump Target 2755 (circle), Spineshatter Dive Target 2756
// (forward), or Elusive Jump Target 2757 (backward). Arrow-bearing groups
// have one forward/one backward plus a circle in groups of three; the pair
// of twos are either both circle or one of each arrow. [T] reports one or
// two arrow pairs per mechanic, not arrows in all three groups.
// Dark High Jump 26382 / Dark Spineshatter Dive 26383 / Dark Elusive Jump
// 26384 are separate jump effects. Candidate jump radius 5y. Circle leaves
// tower at player; forward/backward projects from the player's SNAPSHOTTED
// facing. [T] says 15y, [B] models 14y; both contradict the initial 10y claim.
// Jump applies Physical Vulnerability Up; Fire Resistance Down II is also
// reported in the jump/tower family. Which precise effect grants each needs
// log confirmation. Extra jump victims can be knocked away, often killed.
// Correct: form 1/3 slots W/S/E and 2 slots NW/NE, keeping stack area N.
// Arrows override initial claims; their facing projects a tower across the
// boss into the corresponding soaker's lane. No-arrow groups claim slots
// with conga, early pairing, priority or voice. Each wave lands separately.
// Failure: wrong facing/drop -> LOG SIGNAL: jump-type aura then tower origin
// in an unusable location or wrong lane; FAULT: jumper if their ownership
// and facing/drop are established; CONSEQUENCE: Major for caused death,
// Raid if the missed tower becomes terminal. No blame from arrow aura alone.
// Failure: jump overlap -> LOG SIGNAL: extra jump recipients, knockback,
// vulnerability/death; FAULT: wrong jumper or intruder if proven, otherwise
// unknown; CONSEQUENCE: Major on death, Minor without death/Damage Down.
// Removal: directional debuff resolves into jump; numbered assignment may
// persist beyond that event. Death-time aura cleanup is not successful
// placement. Target substitution if a marked player dies is unestablished.
// Not errors: eight intended personal jumps, facing away for Elusive,
// holding position long enough to snapshot despite an upcoming wheel.
//
// -- DARKDRAGON DIVE AND GEIRSKOGUL --
// What: eight jump-created towers, 3/2/3. Darkdragon Dive 26385 is the
// single-person jump-tower success family; FAIL 26395 is separate raid
// penalty (same display-name family). Candidate tower radius 5y. Tower
// vulnerability prevents immediate repeat soaking; this is why another
// number group must take each set. A successful tower's clone then casts
// Geirskogul 26378, a nearest-player line with ~4.5s cast / ~8y width.
// Correct under standard N-stack plan:
//   Wave 1: all three 3s soak towers made by 1s, then bait three lines out.
//   Wave 2: the two side-slot 1s soak the 2s' NW/NE towers, bait two lines.
//   Wave 3: 2s take E/W towers, south-slot 1 takes S, bait three lines.
// The first pair of side 1s rejoins the second Eye stack after line baits.
// This mapping follows final tower location, not necessarily the same
// original player's side when arrows projected their tower across the boss.
// Failure: empty tower -> LOG SIGNAL: 26395, absent local success and raid
// penalty/Damage Down; FAULT: designated living soaker only if assignment
// and viable drop are known, otherwise player-less; CONSEQUENCE: Raid if
// terminal. Bad drop and absent soak are competing root causes.
// Failure: resistant/extra soak -> LOG SIGNAL: repeated tower hit under
// resistance aura or excess occupants/deaths; FAULT: entrant if proven;
// CONSEQUENCE: Major on death. Exact over-soak behavior is unverified.
// Failure: wrong line bait or late dodge -> LOG SIGNAL: Geirskogul hits,
// Damage Down/death; FAULT: baiter if aimed into known safe stack, victim
// if they failed a correctly aimed dodge, otherwise unknown; CONSEQUENCE:
// Major with Damage Down/death, Minor otherwise.
// Removal: towers resolve once, clones cast then leave; resistance expires.
// Not errors: eight intended tower hits, standing close to a clone to aim
// its line before moving, the eight line casts even when none hits anyone.
//
// -- EYE OF THE TYRANT AND WHEELS --
// What: Gnash and Lash 26386 / Lash and Gnash 26387 are controllers, not
// damage. Gnashing Wheel 26389 is ~8y point-blank (OUT); Lashing Wheel
// 26390 is ~8y-inner donut (IN). Each controller orders two successive
// opposite shapes. Eye of the Tyrant 26388 is ~6y shared damage, two
// occurrences overlapping jump waves 1 and 3. Normally five players stack
// N while three jumpers are away; not an eight-person stack requirement.
// [B]'s display component schedules wheels ~3.7/6.8s after cast START,
// while its action table lists a ~7.6s controller cast. This reference is
// internally inconsistent about timing; actual wheel snapshots remain open.
// Controller names/timeline labels alone do not establish damage snapshots.
// Correct: Eye stack first, then resolve the ordered OUT->IN or IN->OUT
// while the appropriate tower group works. Jumpers must still dodge wheels.
// Failure: wheel hit -> LOG SIGNAL: actual wheel damage, Damage Down,
// knockback/death; FAULT: mover unless bad prior drop forced it;
// CONSEQUENCE: Major with Damage Down/death, Minor otherwise.
// Failure: under-share -> LOG SIGNAL: small Eye share and lethal damage;
// FAULT: missing available helper only if plan proves duty; CONSEQUENCE:
// Major with attribution, Raid if terminal. A tower worker intentionally
// absent from Eye is not a missing stacker. Removal: shared-hit auras expire;
// wheels are instantaneous, no dispel. Not errors: both Eye shares, leaving
// stack after its snapshot, temporarily outside the boss to resolve Gnash.
//
// -- DRACHENLANCE --
// What: 26379 visual cast (~2.9s), helper damage 26380 (~3.5s cast),
// candidate 90-degree frontal cone, range 13y. First aims toward a selected
// player; second is described as always S. Boss rotation is the warning.
// Correct: move around flank/back or outrange before the effect. MT then
// restores safe auto direction. Source selection is not a movable tether.
// Failure -> LOG SIGNAL: actual Lance damage, Damage Down/death; FAULT:
// late dodger unless forced there; CONSEQUENCE: Major with Damage Down/death,
// Minor otherwise. Removal: none. Not errors: boss's random turn, standing
// outside its hitbox to outrange, no second Lance after an early phase kill.
//
// -- ENUMERATED TOWERS --
// What: FOUR intercardinal Darkdragon Dive towers, each requires 1-4 people,
// total EIGHT. [B] maps required count into candidate success actions:
// 26391 = one; 26392 = two; 26393 = three; 26394 = four. These are not
// random unexplained variants. Failure family 26395; radius modeled 5y.
// Correct: start in pairs. Standard slots NW MT+R1, NE OT+R2,
// SW M1+H1, SE M2+H2. H/R anchor; tank/melee leave a one-pip tower for a
// tower needing >2, commonly CW > CCW > opposite. Other anchor plans work.
// All four towers must have their required count at the effect snapshot.
// Failure: count wrong -> LOG SIGNAL: count-specific cast/effect, actual
// occupants and 26395 raid penalty; FAULT: wrong flex/soaker only with plan
// and viable tower, otherwise unknown; CONSEQUENCE: Raid if terminal, Major
// if attributable Damage Down/death. The dead eighth player may be the
// earlier cause; survivors filling seven positions are not seven offenders.
// Removal: towers resolve, producing four clones. THREE clones cast lines;
// ONE instead supplies Soul Tether. It is not four simultaneous Geirskoguls.
// Not errors: one-person or four-person tower damage, anchors staying put,
// two flexes leaving their initial quadrants, correctly populated towers.
//
// -- SOUL TETHERS --
// What: two transferable tethers, one from boss and one from a clone, share
// candidate attack 26396, ~5y AoE busters. Three other clones cast nearest
// Geirskoguls at the same time. Original recipients can be non-tanks.
// Correct: tanks intercept one each. Typical MT takes boss tether; OT clone.
// H/R continue baiting lines unless their own clone is the tether source;
// being tethered by a DIFFERENT clone does not remove one's line-bait duty.
// With conventional mitigation, isolate busters. With both invulnerabilities,
// some plans stack tanks centrally; the damage overlap is intentional.
// Failure: untaken tether/splash -> LOG SIGNAL: final buster victim, extra
// recipients/deaths; FAULT: missed interceptor or misplaced holder only
// with evidence, otherwise unknown; CONSEQUENCE: Major on caused death.
// Failure: line misbait -> LOG SIGNAL: Geirskogul damage/Damage Down/death;
// FAULT: aimer or dodger according to position evidence; CONSEQUENCE: Major
// with Damage Down/death. Removal: tethers resolve on hit, not by dispel;
// status/death retarget semantics remain unverified. Not errors: initial
// non-tank tethers, two tank busters, planned double-invuln tank overlap.
//
// -- PULL ENDERS --
// Revenge of the Horde 29750: ~11s cast, completes around 01:59 from Chorus
// if not killed. Empty/count-failed towers, several jump collisions, or
// unrecoverable tank/stack losses may end it earlier. Failed tower may
// produce survivable damage plus Damage Down; actual terminal outcome needs
// verification. Cast start alone is not Raid if Nidhogg dies before finish.
//
// -- STRATEGY AND NOT ERRORS --
// Westhogg: arrows face W; forward player starts E, backward W, circle S.
// Easthogg: arrows face E; forward starts W, backward E, circle S.
// Both preserve projected landing lanes. The no-arrow conga and initial 3s
// north versus W/S/E prepositions differ without changing final obligations.
// Rotation/mirror plans can move N stack elsewhere; compass is a plan choice.
// Enumeration anchor roles, starting intercardinals and CW/CCW flex order
// vary. Using a different complete occupancy solution is not a failed flex.
// Soul Tethers may use stacked double invulns, isolated conventional CDs,
// or one invuln; P6/P7 cooldown needs can motivate the choice. Holding P2/P3
// damage for alignment or saving limit break for rewind is not an error.
// Damage Down recovery by wall/raise is documented; a voluntary wall after
// mechanics finish differs from walking out with a required jump pending.
// Final Chorus, own jumps, soaks, Eye stacks and successful tank busters are
// intended. Deaths/Weakness from an earlier error are not independent faults.
//
// -- OPEN QUESTIONS --
// 1. Map statuses and action families to FFLogs; do count-specific tower
//    actions identify required occupancy in both successful and failed towers?
// 2. Measure jump offset/facing snapshot (14 vs 15y), jump-to-tower delays,
//    wheel snapshots and final enrage from a kill and early/late wipes.
// 3. Which jump/tower events grant Physical/Fire vulnerability, with what
//    durations? Is too MANY occupants a penalty, or only too few?
// 4. What occurs if a numbered target dies before jump, after placement, or
//    during tower cast? Are replacement jumps and tower ownership visible?
// 5. Are source-owned tower/clone coordinates, nearest line targets, enmity
//    and transfers available to distinguish wrong drop, wrong soak and clip?
// 6. Verify two Eye shares, recovery viability and second Lance targeting;
//    assignments remain external, with no user report supplied.
