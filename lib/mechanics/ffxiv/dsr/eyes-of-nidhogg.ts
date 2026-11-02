// lib/mechanics/ffxiv/dsr/eyes-of-nidhogg.ts
//
// -- DIGEST --
// DSR Ultimate P4 research, expanding the initial Terra model. Obtain both
// one-time spirit buffs; exchange four Clawbound red / four Fangbound blue
// tethers. Red converts damage taken into red-eye damage; blue heals blue
// eye. Two yellow pair-orbs + four blue solo-orbs -> FOUR pairs of Mirage
// Dives -> Steep in Rage / influence enrage. Orb and tether colors differ.
// Four dive waves mean eight target events, not eight DISTINCT targets.
// At least one eye must die before double Steep; either kill order works,
// and blue may revive from Fangbound healing. These correct interactions
// are not mistakes. NA melee/tank-red, Elemental support-red and Mana DPS-red
// plans have different swaps. No static plan or report supplied.
// Sections: "SCOPE AND SOURCES", "SHAPE AND CLOCK", "LOG AND SEVERITY",
// "SPIRIT BUFFS AND RESENTMENT", "HATEBOUND AND TETHER EXCHANGES",
// "GILDED AND AZURE PRICE ORBS", "MIRAGE DIVES", "STEEP AND EYE LIFECYCLE",
// "PULL ENDERS", "STRATEGY AND NOT ERRORS", "OPEN QUESTIONS".
// Main unknowns: growth snapshots, death retargets, piercing duration,
// aura IDs, eye revival, and influence timing. No detector code.
// -- END DIGEST --
//
// -- SCOPE AND SOURCES --
// Ultimate only, checked 2026-11-02. No log verification. Rewind has its own
// module. IDs are candidate decimal game actions/statuses, NOT FFLogs proof.
// [IV] https://www.icy-veins.com/ffxiv/dragonsongs-reprise-ultimate-guide-for-eyes
// [T] https://ffxiv.tuufless.com/elemental/dsr/04_eyes/
// [R] https://ffxiv.tuufless.com/mana/dsr/differences/
// [NA] https://naurffxiv.com/ultimate/dsr
// [APD] https://ultimates.guide/dsr/
// [M] https://materiaraiding.com/ultimate/dsr
// [B] DSW2Enums.cs, DSW2States.cs and P4Hatebound.cs (includes Mirage Dive):
// https://github.com/awgil/ffxiv_bossmod/tree/master/BossMod.Ultimate/Endwalker/Ultimate/DSW2
// [C] https://raw.githubusercontent.com/quisquous/cactbot/main/ui/raidboss/data/06-ew/ultimate/dragonsongs_reprise_ultimate.txt
// [W] https://consolegameswiki.com/wiki/Dragonsong%27s_Reprise_(Ultimate)
// Release 6.11. No P4 numerical hotfix established. Official release and
// historical 7.0 freezing-fix references are in P1. Modern damage changes
// kills/skips. Older three-wave prose conflicts with its own detailed four
// waves and independent timelines; four waves is the supported model.
//
// -- SHAPE AND CLOCK --
// Right Eye = blue/west, starts ~50% HP; Left Eye = red/east, full HP.
// Both are stationary, auto their own enmity holder, and must be defeated.
// Estinien, Alphinaud and spirits are mechanic actors, not killable adds.
// Both defeated before Nidhogg's Influence 100 -> rewind. No checkpoint.
// Blue at zero HP can regain life through Fangbound; first death is not
// necessarily permanent completion of its objective.
// [C] EFFECT clock from Right Eye teleport/sync (not P3 killing blow):
// 00:03 buffs/targetability; 00:10 Resentment; 00:19 Hatebound;
// ~00:26 yellow / ~00:32 blue orbs (player-timed, not automatic effects);
// dives ~00:46/51/56/01:01, two targets each; Steep ~01:11;
// Revenge ~01:30. Influence is a phase timer; exact rate and whether eye
// state modifies the deadline remain unverified. These are research anchors.
//
// -- LOG AND SEVERITY --
// Cast, local hit, orb failure, aura and eye HP changes are distinct.
// Color tethers, orb sizes, primary targets and NPC events may not all be
// in FFLogs. Victim positions do not necessarily identify the bait owner.
// Damage Down is Major if attributable even survived; other avoidable
// nonlethal damage is Minor. Major names a root cause of death/loss; Raid
// marks terminal failure and may be player-less. Loss of spirit buffs after
// death and later missing damage are fallout, not separate personal errors.
//
// -- SPIRIT BUFFS AND RESENTMENT --
// What: Soul of Friendship 26821 (Haurchefant) and Soul of Devotion 26822
// (Ysayle). One targets a player, the other Alphinaud. Both small areas
// (~5y [B]) grant the permissions to damage eyes. One-time applications;
// a dead/raised player loses them and cannot simply reacquire them.
// Resentment 26810 is raid damage plus short bleed (~6s in guides).
// Eye auto 26811 is ordinary single-target tank pressure.
// Correct: stack on Alphinaud south of center until BOTH buffs arrive;
// one tank establishes aggro on each eye; mitigate/heal Resentment.
// Failure: miss initial buff -> LOG SIGNAL: absent spirit aura plus attacks
// ineffective on corresponding eye; FAULT: player only if they left a
// reachable application; CONSEQUENCE: lost damage margin, Major on proven
// caused loss, Raid on failed check. Buff absence after death is fallout.
// Failure: wrong auto target -> LOG SIGNAL: eye auto/death on unintended
// player; FAULT: failed tank pickup only if enmity proves it, otherwise
// unknown; CONSEQUENCE: Major on caused death.
// Failure: raidwide/bleed death -> LOG SIGNAL: Resentment/tick death;
// FAULT: prior cause or group mitigation/healing; CONSEQUENCE: Raid only
// if terminal. Removal: spirit buffs lost on death, bleed expires, no
// required dispel. Not errors: buff gain, Resentment/bleed, intended autos.
//
// -- HATEBOUND AND TETHER EXCHANGES --
// What: Hatebound 26814 assigns four Clawbound (red, status 2775) and four
// Fangbound (blue, 2776). Red takes damage -> red eye takes damage. Blue
// takes damage -> blue eye heals. Attacking the blue eye while holding red
// is therefore normal. Tether color is independent of one's attack target.
// Opposite-color contact exchanges tethers, then Bound and Determined 2777
// prevents another exchange for ~3s. It is a normal lockout, not a penalty.
// Correct: sort colors per plan, often on Estinien, then swap in orb/dive
// rotation. Avoid accidental contact and respect exchange lockout.
// Failure: wrong/accidental swap -> LOG SIGNAL: aura change and wrong-color
// incoming damage / blue-eye heal; FAULT: contact cause only with known
// plan/positions, otherwise unknown; CONSEQUENCE: damage-margin loss,
// escalates on proven caused loss, not automatically a wipe.
// Failure: lockout prevents needed exchange -> LOG SIGNAL: Bound and
// Determined still active, no color change, then repeated dive/orb death;
// FAULT: mistimed swap if established; CONSEQUENCE: Major on caused death.
// Removal: contact replaces color statuses; lockout expires. Death-color
// redistribution is unestablished. Not errors: four of each, repeated
// exchanges, routine unavoidable blue healing, deliberate red-tether soaks.
//
// -- GILDED AND AZURE PRICE ORBS --
// What: SIX orbs, one yellow + two blue at EACH eye. Gilded Price's yellow
// Flare Nova 26817 is a two-person shared hit; Azure Price's blue Flare
// Star 26815 is solo. Local radii ~6y [B]. Separate missed-orb penalties:
// 26818 yellow / 26816 blue, room-wide damage plus Damage Down.
// Growth increases useful red transfer; timeout explodes. Sources disagree
// on growth ordinal ("once", "second", "third"); stage counting is not an
// established detection threshold. Contact/growth/timeout are separate.
// Correct: four initial reds take yellow in TWO pairs, then red transfers
// to the other four who each take ONE blue. Eight intended local recipients.
// Do not clip other orbs/players or take another while Fire Resistance Down
// II from the first soak is active. Both orb colors should be soaked red.
// Failure: left orb -> LOG SIGNAL: 26816/26818 rather than local success,
// raid damage/Damage Down; FAULT: orb assignee unknown without plan;
// CONSEQUENCE: Raid if terminal, Major for attributable penalty/death.
// Failure: solo yellow/repeat orb -> LOG SIGNAL: undershared Nova or another
// local hit under resistance/death; FAULT: absent partner or entrant if
// proven, otherwise unknown; CONSEQUENCE: Major on caused death.
// Failure: early/wrong-color soak -> LOG SIGNAL: small red transfer or
// Fangbound healing at soak; FAULT: known contact actor, otherwise unknown;
// CONSEQUENCE: check margin, escalating on caused loss. Earlier soaks may
// deliberately recover a pull and are not inherently errors.
// Removal: consumed/timed-out orb disappears, resistance expires. Missing
// orb actor alone does not identify soaker. Not errors: two pair soaks,
// four solo soaks, resistance debuffs, eye damage without direct attacks.
//
// -- MIRAGE DIVES --
// What: Mirage Dive 26819 controller; clone hit 26820 (~4y radius).
// FOUR waves ~5.1s apart, TWO red-chain targets per wave. Piercing Resistance
// Down 3131 makes premature repeats lethal. Extra victims are knocked away,
// potentially into the wall. Four red holders spread around blue eye;
// blue holders cluster near its center for controlled replacements.
// Correct: after first THREE waves, two eligible blue holders take red from
// the struck pair and replace their outside slots. No swap after last wave.
// Common NA replacement order: tanks, melee, first-hit pair. First-hit pair
// may return after wave three when their resistance has time to expire.
// Which two of the four reds are selected is not a fixed job assignment;
// eight total primary hits do not imply eight unique recipients.
// Failure: no/late exchange -> LOG SIGNAL: red retained with active piercing
// debuff, repeated hit/death; FAULT: holder versus missing receiver cannot
// be distinguished from hit alone; CONSEQUENCE: Major on caused death,
// Raid if terminal. Receiving an eligible later repeat is normal.
// Failure: overlap -> LOG SIGNAL: extra recipients in one dive, knockback,
// resistance/death; FAULT: misplaced bait or intruder if geometry proves
// it, otherwise unknown; CONSEQUENCE: Major on death, Minor if no death/
// Damage Down. A center victim may have been clipped by an outside bait.
// Failure: accidental contact swap -> LOG SIGNAL: exchanged auras before
// wrong red-pool selection/overlap; FAULT: proven contact cause;
// CONSEQUENCE: Major on caused death/loss. Removal: piercing expires;
// exchange does NOT clear it. Dead-player cleanup is not a safe exchange.
// Not errors: eight primary hits, legal late repeat, intended vulnerability,
// standing close to swap after a dive, final pair retaining their tethers.
//
// -- STEEP AND EYE LIFECYCLE --
// What: Steep in Rage 26813, ~6s cast, both eyes attempt high raid damage.
// Double completion normally wipes. Guides' ~40% red at dive start is a
// damage allocation goal, not a binary HP gate. Red transfers can finish
// it while party attacks blue. At least ONE must die before double Steep.
// Blue killed first can revive with a sliver when Fangbound holders take
// surviving red Steep. Red-first avoids that particular revival.
// Correct: kill one, mitigate/heal remaining Steep, finish BOTH, re-kill
// any revived blue. Any successful kill order is valid.
// Failure: double Steep -> LOG SIGNAL: two source casts/hits and deaths;
// FAULT: raid damage/prior mistakes, no guessed player; CONSEQUENCE: Raid
// if terminal. One completed Steep is not failure.
// Failure: revive ignored -> LOG SIGNAL: blue HP increase/targetability
// followed by failed influence check; FAULT: group unless specific cause
// established; CONSEQUENCE: Raid at terminal failure.
// At influence 100, Creeping Shadows 26823 -> transformation/Revenge of the
// Horde 26402. Meter may not be a logged aura. Removal: eye defeat cancels
// its cast, but healing may restore targetability. Not errors: uneven HP,
// one Steep, blue revival, switching targets, early kill of either eye.
//
// -- PULL ENDERS --
// Revenge completion, terminal double Steep, orb failure or dive cascade.
// Buff loss after one death is costly but not inherently unrecoverable.
// Modern survivability of orb penalties needs evidence. Both-eye defeat
// ends P4; NPC save and spear timeout belong to intermission.
//
// -- STRATEGY AND NOT ERRORS --
// NA: tanks/melees initially red for yellow; H/R blue. Pair swaps give H/R
// red for blue orbs/initial dives. Tanks then melees replace struck targets.
// G1 NW/CCW, G2 NE/CW is common; older APD orientation labels differ.
// Elemental: tanks/healers red, DPS blue. Supports take yellow, DPS take
// blue orbs as red; healers then tanks replace first two waves.
// Mana: all DPS initially red, supports blue; another CW/CCW-from-W rotation.
// Whether red moves to blue or blue moves to red during exchange differs.
// All obey red soaks/lockouts/eligible targets. Red-first/blue-first kills,
// recovery swaps, growth choices and damage holds are not plan errors.
// Unrelated extra damage is not assumed a deliberate red-transfer strategy.
//
// -- OPEN QUESTIONS --
// 1. Map spirit/color/lockout/resistance FFLogs GUIDs and buff-to-eye mapping;
//    do eye healing, NPC effects and immunity outcomes remain visible?
// 2. Measure growth/contact/timeout, local splitting, and early/late/under/
//    over-soak penalties. Which source positions identify individual orbs?
// 3. Verify four waves, piercing duration, legal repeated targets, selection
//    rules and dead/raised target color/retarget behavior.
// 4. Verify revival, single/double Steep survivability, influence rate,
//    final deadline and meter events in current kills and failure pulls.
// 5. Which swaps/primary targets are attributable without assignments?
//    Fetch a kill plus orb/dive/Steep/timeout wipes; no user logs supplied.
