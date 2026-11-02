// lib/mechanics/ffxiv/dsr/dark-king-thordan.ts
//
// -- DIGEST --
// DSR Ultimate P5 research, extending Terra's initial model; no logs/rules.
// Wrath: two tether charges + one large Leap + Twisting Dive/Twisters, eight
// Mercy hits, two Thunderstruck spreads, a marked Cauterize, five Liquid
// Heaven baits and four Altar Flare baits into Grinnaux's donut.
// Death: four Dooms, four cleanse drops, lines/dive/TWISTERS, five quakes,
// eight lightning hits, four shape chains, knockback + two gazes + spreads;
// eight killable meteors. Twisters occur in BOTH trios.
// Thordan must surrender and LIVE. Killing him permits P6 but prevents P7;
// mark the route cause here, not an inevitable later Eyes failure.
// Dooms North/Anchor, Dooms South/Komazou and LPDU fixed-shape knockbacks
// change valid destinations. No static plan supplied. Spell names repeat
// P1/P2; controller versus helper damage must be distinguished.
// Sections: "SCOPE AND SOURCES", "SHAPE AND CLOCK", "LOG AND SEVERITY",
// "INCARNATION AND TANK DAMAGE", "WRATH: OPENING CHARGES AND TWISTERS",
// "WRATH: MERCY, LIGHTNING, FIRE BAITS AND DONUT",
// "DEATH: DOOM, CLEANSES AND MOVEMENT", "DEATH: CHAINS, GAZES AND FLAMES",
// "METEOR CIRCLES", "SURRENDER AND SPARE", "PULL ENDERS",
// "STRATEGY AND NOT ERRORS", "OPEN QUESTIONS". Main unknowns: death
// retargets, cleanse consumers, chain geometry, yield threshold and route IDs.
// -- END DIGEST --
//
// -- SCOPE AND SOURCES --
// Ultimate only. Checked 2026-11-02; guide/event-reference research, not log
// verification. User requests community variants, no group assignments.
// [IV] https://www.icy-veins.com/ffxiv/dragonsongs-reprise-ultimate-guide-for-thordanii
// [T] https://ffxiv.tuufless.com/elemental/dsr/05_alternate_thordan/
// [R] https://ffxiv.tuufless.com/mana/dsr/differences/
// [NA] https://naurffxiv.com/ultimate/dsr
// [U] https://ultistrats.com/guides/dsr/
// [M] https://materiaraiding.com/ultimate/dsr
// [APD] https://ultimates.guide/dsr/
// [B] DSW2Enums.cs, DSW2States.cs, P5WrathOfTheHeavens.cs,
// P5DeathOfTheHeavens.cs and shared DragonsGaze.cs/HeavyImpact.cs:
// https://github.com/awgil/ffxiv_bossmod/tree/master/BossMod.Ultimate/Endwalker/Ultimate/DSW2
// [C] https://raw.githubusercontent.com/quisquous/cactbot/main/ui/raidboss/data/06-ew/ultimate/dragonsongs_reprise_ultimate.txt
// [W] https://consolegameswiki.com/wiki/Dragonsong%27s_Reprise_(Ultimate)
// Release 6.11. No P5 numerical hotfix established; P1 links official
// release and historical 7.0 freeze fix, mainly relevant to P6. Modern
// damage increases overkill risk at surrender, and can skip later uptime
// attacks. It does not turn killing Thordan into a valid clear route.
//
// -- SHAPE AND CLOCK --
// Begins only after successful NPC rescue. Circular arena, lethal edge.
// King Thordan, knights and three resurrected dragons produce mechanics;
// these dragons are not the P6 target pair. Intervening boss uptime contains
// Quaga, cleaving autos, Heel/Might. Most attacks are a timed script; meteor
// clear and surrender are player-driven transitions. No checkpoint.
// [C] EFFECT clock from Incarnation completion:
// 00:06 Dragon's Eye; 00:25 Wrath; untargetable ~00:28;
// ~00:34 lightning assignment; 00:37 initial charges/dive/Leap/Twisters;
// 00:42 Mercy; Liquid ~00:43-48; Altar Flare ~00:47-52;
// ~00:50 Cauterize/donut/lightning resolution; return ~00:51;
// Quaga 00:57; Heel 01:08; Might ~01:11-14; Death 01:25;
// Doom ~01:32; quakes ~01:40/42/44/46/48;
// lightning/dive/spear/Twisters ~01:42;
// knockback/gazes ~01:56; flame spreads ~01:57;
// meteor spawn ~02:00, targetable ~02:01, timeout ~02:15.
// Meteor defeat starts a NEW return clock: Quaga ~00:08, Heel ~00:18,
// Might ~00:21/23/25, Burst completion ~00:36 if not yielded.
// Cactbot's 3000/3200 offsets are artificial sync segments, not proof of
// a fixed 03:55 phase length. Actual return depends on final meteor defeat.
// All timings are reference anchors, not measured FFLogs thresholds.
//
// -- LOG AND SEVERITY --
// DECIMAL IDs below are candidate game actions/statuses from [B], not
// verified FFLogs GUIDs. Helper hits often differ from named boss casts.
// Damage Down is Major if attributable, even alive; other avoidable damage
// is Minor until it causes death/loss. Raid requires a terminal event.
// Position on victim event does not identify line/drop ownership. Facing,
// overhead marks, cleansing objects and tether transfers may be absent.
// Earlier death -> missing flame target -> replacement overlap is a cascade;
// the replacement victim is not automatically the offender. Death removal
// of Doom or chain is not evidence of a successful cleanse/break.
//
// -- INCARNATION AND TANK DAMAGE --
// What: Incarnation 27526 and Dragon's Eye 27527 revive dragons / grant
// Light of Ascalon. Guides estimate ~20% increased damage over P2.
// Cleaving autos, Ancient Quaga 25542, Heavenly Heel 25543 and three
// Ascalon's Might 25541 hits recur. Heel leaves Slashing Resistance Down.
// Correct: isolate facing, mitigate stronger hits, swap Heel -> Might or
// invuln the combo. Opening boss faces S during casts, so MT often starts
// S and party N until boss can turn. Later facing follows tank control.
// Failure: extra auto/buster victims -> LOG SIGNAL: additional recipients/
// death; FAULT: bad facing or intruder only with evidence; CONSEQUENCE:
// Major on caused death. Failure: vulnerable tank repeats combo -> LOG
// SIGNAL: Heel aura, enmity and lethal Might; FAULT: swap/mitigation duty if
// known; CONSEQUENCE: Major. Quaga deaths may be group mitigation/healing,
// not any specific healer; terminal collapse can be Raid.
// Removal: resistance expires, swap changes target, buff not a dispel job.
// Not errors: stronger autos, Quaga, three Mights, planned solo invulns.
//
// -- WRATH: OPENING CHARGES AND TWISTERS --
// What: Wrath 27529. White dragon Vedrfolnir + two knights appear on a
// cardinal: relative N. Two random players get Spiral Pierce 27530 tethers
// (~16y-wide charges). One other player gets Skyward Leap 29346 (~24y).
// Twisting Dive 27531 is a ~10y-wide line; Twister 27532 is the separate
// contact explosion/large knockback, not ordinary dive damage. One small
// ground trap appears at each player snapshot after the dive. Contact can
// explode locally and knock other players into the wall.
// Correct example: two tether baits cross/stretched toward SW/SE wall;
// blue Leap NW, other five along E. When dive/charges resolve, step clear
// of your snapshot and other traps, maintaining separation for Mercy.
// Failure: charge/Leap/dive clips -> LOG SIGNAL: corresponding hit has
// extra recipients, vulnerability/death; FAULT: mispositioned bait or
// intruder if known, otherwise unknown; CONSEQUENCE: Major on death,
// Minor without Damage Down/death. Intended tether/Leap hit is normal.
// Failure: Twister contact -> LOG SIGNAL: 27532 hit/knockback/deaths after
// spawn; FAULT: person contacting trap if ownership/path is established,
// not everyone knocked; CONSEQUENCE: Major for caused death, Raid for
// terminal cascade. Explosion source may be a helper, not bait owner.
// Removal: tethers/marker resolve; traps persist until contact/cleanup.
// Death-time retargeting or skipped traps is unverified. Not errors:
// charge damage on intended baits, normal Leap, moving before visible trap.
//
// -- WRATH: MERCY, LIGHTNING, FIRE BAITS AND DONUT --
// What: two Thunderstruck debuffs from Chain Lightning 27535; damaging
// spread effect 27536 (~5y candidate). Green marked player aims Darkscale's
// Cauterize 27533 (~20y width). Ascalon's Mercy Revealed 25546 controller,
// 25547 hit: EIGHT player-directed cones, intended one each, unlike P2's
// Concealed bait-and-dodge. It applies Physical Vulnerability Up; two kill.
// Liquid Heaven 27537: five sequential target-location hits / fire regions
// (~6y). Altar Flare 25572 controller, 25573 four delayed ~8y explosions.
// Grinnaux's Empty Dimension 25306 is a ~6y-inner donut at the end.
// Correct: spread Mercy rays, aim green behind Charibert away from final
// safe pocket, keep two fire bait routes out of Grinnaux's pocket. Lightning
// players end toward outside of donut safe zone, party toward inside.
// Remaining fire targets move between hits, then enter safe spot on time.
// Sources describe Liquid on an unassigned player and Altar on a previously
// marked/tethered player, excluding lightning; confirm exact eligibility.
// Failure: doubled Mercy -> LOG SIGNAL: multiple 25547 hits under Physical
// vulnerability/death; FAULT: overlapping cone owners if proven, otherwise
// unknown; CONSEQUENCE: Major. One intended Mercy hit is not avoidable.
// Failure: lightning clip -> LOG SIGNAL: extra 27536 recipients, Paralysis/
// Damage Down; FAULT: misplaced marked carrier or intruder if identified;
// CONSEQUENCE: Major with Damage Down/death, Minor otherwise.
// Failure: bad green aim -> LOG SIGNAL: Cauterize across final pocket,
// extra victims/deaths; FAULT: green bait if marker/geometry proves it;
// CONSEQUENCE: Major, Raid if terminal. A dive victim need not own aim.
// Failure: fire/donut -> LOG SIGNAL: Altar hit, extra Liquid damage/Burns,
// Empty Dimension, Damage Down/death; FAULT: bad placer when pocket blocked,
// late mover if valid route remained, otherwise unknown; CONSEQUENCE:
// Minor, Major with Damage Down/death. Fire targets dying can retarget
// remaining baits to random players [W]; unexpected late drops may be fallout.
// Removal: Thunderstruck expires to spread; ground fire persists; Altar
// explosions resolve individually. Death timing of lightning needs evidence.
// Not errors: first target hits when mechanically required, eight Mercy hits,
// two isolated lightning blasts, successful bait routes and donut entry.
//
// -- DEATH: DOOM, CLEANSES AND MOVEMENT --
// What: Death of the Heavens 27538. Deathstorm 27540 applies Doom to FOUR
// players (candidate status 2976, ~25-26s). Wings of Salvation 27541 visual,
// 27542 ground effect: FOUR non-Doom players leave consumable cleanse spots,
// one needed per Doom. Non-Doom contact can waste a spot [W]; interaction
// visibility and whether an unneeded consume is logged require confirmation.
// Guerrique is the off-center quake origin; his direction defines relative
// N. Five Heavy Impact regions 25558-25562 expand in ~6y radial bands.
// Lightning Storm 25549 spreads all eight. Spear of the Fury 27539,
// Twisting Dive 27531 and Darkscale Cauterize cut routes; TWISTERS follow
// the dive again. This is not just Doom -> knockback with an empty arena.
// Correct: conga sort four Doom/four non-Doom into plan positions so safe
// cleanse spots land. Resolve individual lightning, step clear of Twisters,
// dodge into cleared quake bands and approach center without consuming
// needed puddles. Non-Doom drops should be reachable after knockback.
// Failure: quake/dive/spear/Twister -> LOG SIGNAL: named hit/Stun/Damage
// Down/knockback/death; FAULT: mover or proven bad trap contact, otherwise
// unknown; CONSEQUENCE: Major with Damage Down/death, Minor otherwise.
// Failure: Doom expires -> LOG SIGNAL: aura reaches deadline and death;
// FAULT: missed reachable cleanse, misplaced drop or stolen cleanse must
// be distinguished; no automatic victim blame; CONSEQUENCE: Major if
// attributable, Raid if remaining sequence is terminal.
// Failure: wrong consume -> LOG SIGNAL: identifiable cleanse interaction,
// object disappears before assigned Doom removal; FAULT: consumer only if
// visible, otherwise unknown; CONSEQUENCE: Major for caused death.
// Removal: cleanse removes Doom successfully; expiry kills; death cleanup
// does not prove a cleanse. No Esuna solution. Four one-use pools are not
// persistent healing circles. Not errors: own lightning, consuming one's
// Doom cleanse, controlled movement delays to let quakes clear.
//
// -- DEATH: CHAINS, GAZES AND FLAMES --
// What: four symbol-linked pairs; Circle = two Dooms, Cross = two non-Doom,
// Triangle/Square each one Doom + one non-Doom. Circle selection is baited
// by the two farthest-apart Doom players, enabling intentional anchors.
// Faith Unmoving 25308 knocks ~16y from Grinnaux. Heavensflame controller
// 25310, spread 25311 (~10y) gives Fire Resistance Down II. Unbroken chain
// penalty Holy Chain 25312. Dragon's Gaze helper 25553 / Glory 25554 are
// separate simultaneous gazes; facing must avoid both through knockback.
// Correct: start close, aim opposite radial knockbacks, stretch chains,
// land Doom at assigned cleanse then adjust if needed. Resolve eight
// spreads without overlap, including during post-knockback recovery.
// Failure: unbroken chain -> LOG SIGNAL: Holy Chain/Damage Down or chain
// persists to deadline; FAULT: pair unless one mover proven; CONSEQUENCE:
// Major with Damage Down/death. Relative starting length may affect break;
// [B]'s ~32y break geometry is provisional, not a verified absolute rule.
// Failure: gaze -> LOG SIGNAL: Hysteria/gaze then forced-movement death;
// FAULT: facing player unless already controlled; CONSEQUENCE: Minor,
// Major with Damage Down/death. Correct-looking final facing can be late.
// Failure: flame overlap/edge -> LOG SIGNAL: doubled spread/resistance,
// Faith then wall death; FAULT: misplaced player only when destination/
// snapshot establish it, otherwise unknown; CONSEQUENCE: Major on death.
// [W] reports a dead spread target can duplicate another player's flame;
// raising into Transcendent may be used for recovery. These are not proof
// that a living replacement intentionally overlapped someone.
// Removal: separation breaks chains, gaze statuses expire, spread resolves.
// Immunity can invalidate intended knockback/cleanse even though it prevents
// movement; valid alternate solutions must still satisfy all obligations.
// Not errors: eight own spread hits, paired chain removal, Doom cleansing,
// surviving gaze-free knockback and planned raise-invulnerability recovery.
//
// -- METEOR CIRCLES --
// What: Holy Meteor 27543 produces EIGHT targetable circles at the eight
// compass points. Meteor Impact 27544 is their timeout/raid penalty, distinct
// from P2's unkillable comet trails. Approximate ~15s targetable burn window
// in [C], not a measured deadline. Each surviving circle can cause failure.
// Correct: destroy all eight, commonly caster LB2 on three adjacent circles,
// others assigned by knockback destinations. A ranged LB or precisely aimed
// four-target LB is another plan; use of LB is not a game-mandated button.
// Failure: surviving meteor -> LOG SIGNAL: source circle Impact / raid hit,
// remaining HP/deaths; FAULT: external damage duty, normally player-less;
// CONSEQUENCE: Raid if terminal. Low total boss DPS does not identify which
// circle was missed. Removal: circle defeat ends its threat; last defeat
// triggers boss return. Not errors: LB use, unequal assigned meteor damage,
// staggered kills, saving boss burst while destroying objectives.
//
// -- SURRENDER AND SPARE --
// What: Thordan must reach surrender threshold, then stay alive. Sources
// state "below 3%", some use 2.8% as safety/display target or say 2%.
// Surrender 26215 is a stronger candidate state cue than rounded displayed
// HP. He drops sword/kneels; attacks must stop, including lingering damage.
// Aetheric Burst 27528 is the ~6s failed-damage-check cast if he never yields.
// Correct: reach yield before Burst completes, stop damage as surrender
// approaches, confirm kneel and spare. HP disappearing at transition is not
// necessarily enemy death. Pet/DoT/queued-hit overkill behavior is unverified.
// Failure: fail threshold -> LOG SIGNAL: completed Burst and raid deaths;
// FAULT: raid damage/prior loss; CONSEQUENCE: Raid, player-less.
// Failure: kill instead of spare -> LOG SIGNAL: actual Thordan death after
// damage, absent surviving surrender route, later wrong Eyes branch;
// FAULT: post-yield attacker if clearly proven, otherwise group/unknown;
// CONSEQUENCE: Raid for clear route even if P6 remains playable.
// Removal: surrender cancels/changes combat script and advances P6; it is
// not a normal boss-kill requirement. Not errors: damage holds, long waits
// after kneel, stopping at a safe higher displayed HP while existing damage
// resolves, skipped final buster because surrender occurred earlier.
//
// -- PULL ENDERS --
// Burst completion, terminal meteor failure, lethal chains/overlaps and
// unrecoverable Doom/Twister cascades. Killing Thordan locks out P7: both
// P6 dragons can still be fought, but the repeated Eyes lack the spirit
// buffs required to finish. That later branch is the P5 route consequence.
// A single Doom death or Damage Down is not automatically an inevitable
// wipe; recovery may exist. Cast start/HP threshold alone is not a kill.
//
// -- STRATEGY AND NOT ERRORS --
// Wrath: Party Right (relative E) with crossed southern tethers / NW Leap
// is a common NA/Elemental family; mirrored or LPDU bait placements differ.
// Final green bait is behind BLM, party safe at WAR; compass depends on
// their actual locations. Lightning left/right priorities are assignments.
// Death: Dooms North with two inner E/W + two outer NW/NE ("2-2") and
// anchored Doom knockback slots; non-Doom shapes adjust opposite them.
// Dooms South/Komazou mirrors the cleanse layout. Mana/OCE use this family.
// LPDU fixed-symbol destinations differ from anchored Doom: circle E/W,
// cross N/S, triangle/square specified opposite diagonals. These can rotate
// with warrior orientation. Wrong shape under one plan may be right in another.
// Conga order, circle-bait pair, meteor LB location and who burns each circle
// vary. Named plans are not individual raid assignments for this user.
// Tank invulns may be saved for P6 or P7 6-1-1; different holds/mitigation
// are valid. Intentional hit/soak damage, eight Mercy hits, Quaga, chain
// breaks, cleanses, spare holds and meteor LB are expected.
//
// -- OPEN QUESTIONS --
// 1. Map all FFLogs GUIDs: controllers vs hits, Twister, Thunderstruck,
//    Doom/cleanse/chain penalty, fire regions, meteor Impact and Surrender.
// 2. Which cleanse consumer, ground location, circle-bait markers, gaze facing
//    and primary line targets are available to assign fault without a plan?
// 3. Confirm death retargets for Liquid/Altar/Heavensflame and raise immunity;
//    does Doom or Thunderstruck resolve early on death or just clean up?
// 4. Measure chain break/deadline, Doom duration and cleanse radius, actual
//    meteor burn window and return-relative enrage clock in current logs.
// 5. Resolve yield threshold/display rounding, queued damage/DoT overkill,
//    and actual kill versus hidden-target transition. Which event proves
//    the wrong route at P5, before seeing its P6 consequence?
// 6. Fetch successful P5 plus Wrath, Doom/chain, meteor and spare-failure
//    wipes. No own logs or static assignments supplied.
