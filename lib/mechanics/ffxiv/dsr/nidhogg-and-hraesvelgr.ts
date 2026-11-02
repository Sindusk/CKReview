// lib/mechanics/ffxiv/dsr/nidhogg-and-hraesvelgr.ts
//
// -- DIGEST --
// DSR Ultimate P6 research, expanding Terra's model. Two stationary dragons,
// opposite-element breath pairs first; two Akh Afah HP-balance checks;
// Hallowed Wings twice (near/far busters); Wroth moving Akh Morn/orbs then
// four spreads + two pairs; second breaths must KEEP elements for opposite
// Cauterize; tanks lead dives, stop Pyretic actions, survive Touchdown/DoTs.
// Mortal Vow: initial random DPS then four ~34s passes; Atonement is 100s
// per first-hand world-first interview, NOT the draft's two minutes. Solemn
// Vow breaks on Hraesvelgr-caused death. Late vow breaks may be recoverable,
// so enrage buff alone is not always Raid. Early breaks usually end pulls.
// Both dragons HP-lock until final check; then finish both before Revenge.
// P5 spare is prerequisite; the bad-route source belongs to P5.
// WB1 cancels elements; WB2 intentionally retains them. Static WB2 can have
// visibly short tethers that are survivable. Wroth spread owner may receive
// NO own damage; white failure has distinct Entangled Pyre 29741.
// Sections: "SCOPE AND SOURCES", "SHAPE AND CLOCK", "LOG AND SEVERITY",
// "WYRMCLAW AND ENMITY", "WYRMSBREATH: ELEMENTS AND DISTANCE",
// "WYRMSBREATH: TANK BRANCHES", "MORTAL VOW", "SOLEMN VOW",
// "AKH AFAH AND HP BALANCE", "HALLOWED WINGS AND PLUME",
// "WROTH: ORBS, AKH MORN AND PUDDLES", "WROTH: SPREADS AND PAIRS",
// "SECOND BREATHS AND FINAL CAUTERIZE", "TOUCHDOWN AND FINISH",
// "STRATEGY AND NOT ERRORS", "PULL ENDERS", "OPEN QUESTIONS".
// Main unknowns: Vow death timing, HP threshold, elemental/DoT ownership,
// early Wroth explosions, short-tether damage curve and late-enrage recovery.
// -- END DIGEST --
//
// -- SCOPE AND SOURCES --
// Ultimate only; checked 2026-11-02. No report verification or static plan.
// [IV] https://www.icy-veins.com/ffxiv/dragonsongs-reprise-ultimate-guide-for-nidhogg-and-hraesvelgr
// [T] https://ffxiv.tuufless.com/elemental/dsr/06_double_dragons/
// [TM] https://ffxiv.tuufless.com/mana/dsr/06_double_dragons/
// [R] https://ffxiv.tuufless.com/mana/dsr/differences/
// [NA] https://naurffxiv.com/ultimate/dsr
// [U] https://ultistrats.com/guides/dsr/
// [M] https://materiaraiding.com/ultimate/dsr
// [WF] First-hand Neverland interview: 34s Vow, 100s Atonement, viable
// four-person rotation. Stronger timing evidence than rounded guide prose:
// https://www.archon.gg/ffxiv/articles/news/neverland-world-first-dragonsongs-reprise-interview
// [DRK] Practical cross-phase mitigation/invulnerability choices:
// https://www.thebalanceffxiv.com/jobs/tanks/dark-knight/fight-tips/the-dragonsongs-reprise-ultimate-drk-guide/
// [B] DSW2Enums.cs, DSW2States.cs, P6Wyrmsbreath.cs, P6MortalVow.cs,
// P6AkhAfah.cs, P6HallowedWings.cs, P6HotWingTail.cs, P6WrothFlames.cs,
// P6Touchdown.cs; independent game action/geometry observations:
// https://github.com/awgil/ffxiv_bossmod/tree/master/BossMod.Ultimate/Endwalker/Ultimate/DSW2
// [C] https://raw.githubusercontent.com/quisquous/cactbot/main/ui/raidboss/data/06-ew/ultimate/dragonsongs_reprise_ultimate.txt
// [W] https://consolegameswiki.com/wiki/Dragonsong%27s_Reprise_(Ultimate)
// Release 6.11. Official 7.0 freezing malfunction existed from launch;
// server fix completed 2024-07-02 00:38 PDT. Old affected-period pulls may
// disagree on elemental outcomes and must be treated as historical cases:
// https://na.finalfantasyxiv.com/lodestone/news/detail/d6a632f3c438f8ef92954f30af4d3cb1b79af011
// No other phase-specific numerical hotfix established. Jobs/gear alter
// survival/kill windows, not elemental cancellation requirements.
//
// -- SHAPE AND CLOCK --
// Square arena/perimeter death. Nidhogg west, Hraesvelgr east; stationary
// omnidirectional hitboxes, separate enmity/HP. They reposition during dives.
// Not an equal-HP-at-all-times mechanic: balance is checked at TWO Akh Afahs.
// [T] reports 1-HP floors until final enrage, so early high damage may be
// held/redirected. Both must be finished after release; no checkpoint.
// [C] EFFECT clock from P5 Surrender (NOT first targetable dragon):
// 00:17 targetable; 00:35-36 WB1; 00:43 Vow initial;
// 00:54 Afah1; 01:07-09 Wings1/Plume/Nidhogg dive;
// 01:17 Vow pass1; 01:22 Wroth; 01:33-38 four Akh Morns;
// 01:45 Hot Wing/Tail; 01:47 spreads/pairs; 01:51 pass2;
// 02:03 Afah2; 02:15 Wings2 + Hot Wing/Tail; 02:25 pass3;
// 02:35-36 WB2; 02:48 final dives; 02:55 Touchdown;
// 02:59 pass4; ~03:22 Revenge completion. Subtract ~17s for a clock from
// targetability. Fixed script, player-controlled final kill timing. Death/
// recovery may change pass timing; do not substitute these for aura timers.
// Transition Resentment/Shockwave/Alternative End is owned by P7's header.
//
// -- LOG AND SEVERITY --
// IDs: candidate DECIMAL game actions/statuses, not verified FFLogs GUIDs.
// Distinguish Nidhogg/Hraesvelgr and their helpers even for same-name hits.
// Boss glow, tethers, HP fraction, source DoT owner and Vow receivers may
// need more than a victim's damage event. FFLogs availability is unverified.
// Attributable Damage Down is Major, even alive. Other avoidable damage is
// Minor unless it causes death/loss. Major requires a root-cause player;
// Raid means inevitable wipe. An unknown cause stays unknown.
// A Hraesvelgr killing blow establishes possible Solemn break, not that
// victim was at fault: prior Pyretic, overlap or missing mitigation may own
// the cause. A late enrage may be survived; actual remaining sequence matters.
//
// -- WYRMCLAW AND ENMITY --
// What: Nidhogg Wyrmclaw 27946, Hraesvelgr Wyrmclaw 27938, frequent heavy
// single-target autos. Separate tanks normally maintain separate enmity.
// Correct: pick up assigned dragon and sustain personal mitigation/healing.
// Some groups transfer enmity to force one tank to take a selected breath
// buster; restore separated threat before dangerous overlapping autos.
// Failure: wrong target/double autos -> LOG SIGNAL: two source auto streams
// on wrong player, lethal damage, Hraesvelgr vow break; FAULT: proven missed
// pickup/transfer or prior tank death, otherwise unknown; CONSEQUENCE: Major,
// Raid if resulting enrage/collapse is terminal.
// Removal: enmity changes via tank actions/death; no aura cleanse. Not errors:
// tank on either dragon, chosen enmity transfers, sustained intended autos.
//
// -- WYRMSBREATH: ELEMENTS AND DISTANCE --
// What: both occurrences assign THREE non-tanks to each dragon: SIX tethers.
// Dread Wyrmsbreath controllers 27954 normal / 27955 glowing;
// Great Wyrmsbreath 27956 normal / 27957 glowing. Actual Flame Breath 27958,
// Ice Breath 27959 are aimed cones, not the named controller's victim hit.
// [B] models ~20-degree full cones, range 100y, angle explicitly provisional.
// Each hit's damage depends on VICTIM distance to its SOURCE, including a
// partner hit by someone else's tether. Tether indicator only describes its
// own holder-source separation. Swirling Blizzard 27960 donut limits safe
// area to ~20y radius [B]; stepping out to stretch farther can itself kill.
// Fire gives Boiling 2898, ice Freezing 2899, with elemental resist-down.
// Opposite simultaneous breaths cancel. Guides describe ~12s until Boiling
// -> Pyretic 960, Freezing -> Deep Freeze; latter immobilizes ~30s.
// MOVING does not prevent this scripted Deep Freeze. Pyretic punishes actions,
// movement and autos, not merely movement. Opposite later Cauterize cleanses.
// Correct WB1: three separated PAIRS, each one fire + one ice, all six
// players take one of each and cancel both. Stretch enough from BOTH dragons.
// Correct WB2: all six solo, take exactly own element; retain it for dives.
// Failure: double same element / wrong cone -> LOG SIGNAL: duplicate element
// hits under resistance, death; FAULT: misplaced holder or entrant if proven,
// otherwise unknown; CONSEQUENCE: Major, Raid if Hraesvelgr break terminal.
// Failure: uncanceled WB1 -> LOG SIGNAL: lingering Boiling/Freezing then
// Pyretic/Deep Freeze; FAULT: wrong pair positioning if known; CONSEQUENCE:
// Major on caused death/loss. Aura presence alone after WB2 is SUCCESS.
// Failure: too close / donut -> LOG SIGNAL: excessive distance-scaled hit
// or Swirling Blizzard damage/death; FAULT: mover only if distance/origin
// establishes avoidability; CONSEQUENCE: Major on death/Damage Down, Minor
// otherwise. A short-looking STATIC WB2 tether is not automatically failure.
// Removal: opposite-element hit cancels, otherwise countdown transforms;
// no required Esuna, death-time effects unverified. Not errors: WB1 double
// opposite hits, WB2 one hit/retained debuff, temporary resistance debuffs.
//
// -- WYRMSBREATH: TANK BRANCHES --
// What: if ONE mouth glows, glowing dragon fires fixed Dark Breath 27963
// or Holy Breath 27964 through middle; NON-GLOWING dragon hits its enmity
// target with Staggering Breath 27965 (~15y radius). Extra victims can be
// knocked away/killed. This reverses the tempting "glowing dragon busters"
// assumption. If BOTH glow: Dark Orb 27961 + Holy Orb 27962, ~6y shared
// tank hits applying Sustained Dark Damage / Sustained Light Damage.
// Taking both cancels those opposed lethal DoTs.
// Correct: one glow -> isolated buster on non-glowing target, avoid central
// breath; two glows -> tanks stack for BOTH orbs, party out of their splash.
// Tanks' exact north/south positions differ between WB1/WB2 and layouts.
// Failure: wrong branch / extra victim -> LOG SIGNAL: Staggering splash or
// central Breath on unintended player, death; FAULT: bad tank bait or
// intruder if proven; CONSEQUENCE: Major, possibly terminal Solemn break.
// Failure: unpaired orbs -> LOG SIGNAL: only one orb hit then persistent
// elemental DoT/death; FAULT: missing tank overlap if established;
// CONSEQUENCE: Major, Raid if terminal. Surviving the orb hit alone is not
// proof of success because the delayed DoT can kill.
// Removal: BOTH opposite orb effects cancel DoTs; expiry/death behavior
// needs logs. Not errors: double shared orb hits and their brief statuses,
// isolated Staggering, a deliberate invuln or conventional cooldown plan.
//
// -- MORTAL VOW --
// What: initial 27952 on random DPS, ~5y AoE. Target gains Mortal Vow 2896;
// extra initial victims get Suppuration 3133 (50% max HP reduction and
// vulnerability). Vow DoT ticks, and HEALING DONE is reduced, not simply
// healing received. At ~34s expiry, pass effect 27953 transfers to ONE
// eligible nearby player; old holder gets Mortal Atonement 2897.
// [WF] gives Atonement 100s. Three later Vow durations total 102s, explaining
// why initial holder may legally take final pass. A two-minute assumption
// contradicts the documented rotation. Additional eligible bystanders can
// change random receiver selection and suffer Suppuration.
// Correct: initial DPS spread, then exactly holder + chosen eligible receiver
// within ~5y at each pass, everyone else clear. Four full-script passes,
// typically after Wings1, after Wroth, after Wings2, after Touchdown.
// Pass order can reuse initial holder only after Atonement actually expires.
// Failure: no eligible receiver -> LOG SIGNAL: pass effect with no new Vow,
// Nidhogg Damage Up/Damage Taken Down enrage; FAULT: passer/receiver only
// with duty/positions, otherwise unknown; CONSEQUENCE: Raid if terminal.
// Failure: extra bystander / repeat-ineligible -> LOG SIGNAL: Suppuration,
// wrong/new Vow recipient or Atonement holder death; FAULT: intruder or
// holder mispositioning only if established; CONSEQUENCE: Major on caused
// death/loss, including attributable crippling mechanic penalty.
// Failure: initial Vow overlap -> LOG SIGNAL: initial Suppuration on nearby
// players; FAULT: wrong spread if identifiable; CONSEQUENCE: Major on caused
// death/loss, Raid if terminal Hraesvelgr cascade.
// Removal: natural expiry is PASS, not an error or dispel. Phase cleanup
// after both dragons finish is not a missed fifth pass. Death case has a
// SOURCE CONFLICT: IV says it still explodes at original expiry on corpse;
// M describes release on death. A rescue pickup from corpse is documented,
// but exact early-vs-scheduled timing is unverified. Holder death therefore
// does not alone prove immediate failed Vow. No arbitrary missed-pass window.
// Not errors: four intended passes, minor DoT, planned tank/eligible DPS
// receivers, valid return to original carrier, recovery from a corpse.
//
// -- SOLEMN VOW --
// What: Hraesvelgr breaking his oath by KILLING a player causes Damage Up
// and Damage Taken Down. Includes his autos, Ice Breath, Holy/Plume attacks,
// Afah, Cauterize and attributable lingering ice DoT/Frostbite. Nidhogg-only
// deaths are not by themselves proof of Solemn break.
// Correct: prevent Hraesvelgr deaths, especially secondary ice-DoT deaths
// after dives. Heal affected tanks through targetless transition periods.
// Failure -> LOG SIGNAL: Hraesvelgr-owned killing hit/tick then enrage buffs/
// stronger subsequent damage; FAULT: original cause, not automatically
// victim or healer; CONSEQUENCE: Raid if remaining attacks/check become
// impossible; Major for established caused death if recovery remains.
// [U/M] explicitly describe late recovery using tank LB2, shields and quick
// finishing. Enrage is usually terminal EARLY, not logically terminal at
// every late timestamp. Removal: no established way to cleanse dragon enrage;
// phase defeat ends threat. Not errors: Nidhogg-caused death without actual
// oath break, planned late recovery, large but survived Hraesvelgr hits.
//
// -- AKH AFAH AND HP BALANCE --
// What: TWO sets, one stack on each healer. Nidhogg 27971 controller -> 27972
// damage; Hraesvelgr 27969 -> 27970. Candidate radius 4y, four per light party.
// Dragons' HP difference must be within about THREE percentage points at
// resolution; higher-HP dragon's stack becomes lethal if imbalance fails.
// Sources use 3%; M advises 2.8%. Exact comparison/rounding unresolved.
// Purple tether warns Nidhogg higher; white Hraesvelgr higher. Tether absent
// normally means balanced. This is not a universal live-HP equality rule.
// Correct: separate two stacks, heal/mitigate, shift damage to higher HP
// before the cast ends. Plan for uneven uptime during Wings/Wroth so the
// second balance can be restored. Group N/S is common, not a game requirement.
// Failure: imbalance -> LOG SIGNAL: HP difference at snapshot, warning
// tether if available, unusually lethal stack; FAULT: group damage plan or
// proven prior mistake, not the healer receiving it; CONSEQUENCE: Raid if
// terminal. Two regular hits cannot establish imbalance without HP evidence.
// Failure: stack overlap/small share -> LOG SIGNAL: both source hits on same
// players / Magic Vulnerability Up / lethal small share; FAULT: mispositioned
// stack/missing helper with evidence; CONSEQUENCE: Major, Raid if terminal.
// Removal: short vulnerabilities expire, HP warning changes with balance.
// Not errors: two four-player shares, uneven HP outside checks, damage
// holds/target changes and no player attacks into a dragon temporarily away.
//
// -- HALLOWED WINGS AND PLUME --
// What: Hraesvelgr glowing wing cleaves N or S half. Controllers encode
// left-near 27939, left-far 27940, right-near 27942, right-far 27943.
// Actual half hits 27941/27944; Hallowed Plume 27945 targets TWO selected
// players with ~10y circular busters. Head DOWN = closest two, UP = farthest
// two, measured from HRAESVELGR, not arena center or the party's MT.
// First Wings overlaps Nidhogg's Cauterize 27966 through E or W, leaving
// one quadrant safe. Second overlaps Nidhogg's Hot Wing/Tail instead.
// Hot Wing controller 27947 -> side-cleave 27948 (center lane safe);
// Hot Tail 27949 -> center-cleave 27950 (side lanes safe).
// Correct: identify safe quadrant/lanes, put both tanks at required extreme
// distances while party occupies the opposite distance. Separate busters.
// Common MT edge, OT mid assignments; remapped plans may reverse this.
// Failure: wing/line -> LOG SIGNAL: actual wing/dive/hot damage/Damage Down/
// death; FAULT: mover unless forced; CONSEQUENCE: Major with Damage Down/
// death, Minor otherwise. Failure: wrong Plume bait/splash -> LOG SIGNAL:
// non-tank primary targets or extra ~10y victims; FAULT: tank distance error
// versus non-tank intrusion only with positions, otherwise unknown;
// CONSEQUENCE: Major on death, possible terminal Solemn break.
// Removal: visual cues/casts resolve; no cleanse. Not errors: tank Plumes,
// near/far party shifts, uptime loss to meet the only safe quadrant.
//
// -- WROTH: ORBS, AKH MORN AND PUDDLES --
// What: Wroth Flames 27973; THREE sets of THREE Scarlet Price orbs (nine),
// first middle, later opposite corners. Flame Blast 26409 explodes in
// plus-shaped rows/columns; [B] models 6y width, 44y arms. These are not
// P4's collectible orbs (some guides call these Sable Price instead).
// Hraesvelgr Cauterize 27967 can cover W, a CENTRAL strip, or E. With the
// central pattern either flank can work; the common route favors W uptime.
// Nidhogg's Akh Morn first 27974, repeats 27975: FOUR shared hits, ~1.6s
// apart. Each leaves a persistent ~6y region causing severe Bleeding.
// Correct: choose corner safe from dive and next orb set, then move tightly
// together between each puddle/stack snapshot through the clear orb lanes.
// Widely used J-shaped path changes orientation by the pattern. Early
// acceleration leaves the stackers behind; standing too long in puddle bleeds.
// Failure: orb/dive -> LOG SIGNAL: Flame Blast or Cauterize damage/death;
// FAULT: mover unless pushed; CONSEQUENCE: Major with Damage Down/death,
// Minor otherwise. Failure: moving-stack split -> LOG SIGNAL: fewer shared
// recipients, outsized Akh Morn hit/death; FAULT: too-fast mover versus lagger
// only with chosen path/snapshots; CONSEQUENCE: Major on caused death.
// Failure: puddle contact -> LOG SIGNAL: ground Bleeding/ticks/death after
// local stack; FAULT: mover unless puddle placed across valid route;
// CONSEQUENCE: Minor if healed without Damage Down, Major on death.
// Removal: orb actors explode, puddles persist through later placements;
// bleed expiry/death not proof that no contact occurred. Not errors: FOUR
// intended party stack hits, nine orb casts, leaving each stack puddle,
// moving without melee uptime on unfavorable dive patterns.
//
// -- WROTH: SPREADS AND PAIRS --
// What: FOUR Spreading Flames (status 2758, often purple/dark markers),
// TWO Entangled Flames (2759, white), TWO unmarked. Random distribution,
// not fixed supports/DPS. Resolve around Hot Wing/Tail at Wroth ~00:25.
// Spreading damage 29739, ~5y, affects OTHERS; owner's own spread need not
// deal damage to owner [T]. Extra victims get Damage Down/knockback.
// Entangled damage 29740, ~4y, needs white holder + ONE unmarked partner;
// Fire Resistance Down II makes overlapping pairs lethal. Entangled Pyre
// 29741 is separate RAID failure on invalid/absent stack or early loss.
// Correct: four isolated spreads and two separated pairs, all in current
// Hot Wing/Tail safe lane and away from prior puddles. Standard NA/Elemental
// spreads W (Nidhogg), pairs E (Hraesvelgr); Mana reverses sides.
// Failure: spread clip -> LOG SIGNAL: extra 29739 recipients/Damage Down/
// knockback; FAULT: misplaced spread or entrant if established;
// CONSEQUENCE: Major with Damage Down/death, Raid if terminal cascade.
// Failure: solo/overlap white -> LOG SIGNAL: 29741 raid damage/Damage Down,
// or repeated pair hits under Fire resistance; FAULT: missing partner,
// wrong holder/partner position or earlier death only with evidence;
// CONSEQUENCE: Raid if terminal, otherwise attributable Major.
// Death effects: Spreading resolves immediately at carrier death; Entangled
// carrier death can trigger raidwide Entangled Pyre. Insufficient living
// targets at assignment is also reported to trigger the white penalty.
// Earlier fatal orb/puddle can therefore detonate debuffs before timer,
// creating a cascade; last explosion victim is not a new offender.
// Removal: expiry is intended resolution, death can trigger early effect;
// not dispellable. Not errors: spread holder with NO own damage, two-person
// pair hits, unmarked player sharing, manual/automarker priority variations.
//
// -- SECOND BREATHS AND FINAL CAUTERIZE --
// What: six tethers/tank branch repeat. THIS TIME do not pair opposites:
// three fire and three ice debuffs must remain. After ~12s they transform;
// dragons move to random N positions and each dive one arena half.
// Correct: fire/Boiling/Pyretic players take HRAESVELGR ice dive; ice/
// Freezing/Deep Freeze players take NIDHOGG fire dive. One tank leads each
// line at its N end, taking enhanced initial damage and subsequent DoT.
// Tanks lack non-tank opposite-element protection, so require invuln or
// strong conventional mitigation plus continued healing. Two dives are
// intended incoming damage for correct element groups, not avoidable AoEs.
// Stop actions, movement and auto-attacks before Pyretic, until ice hit
// removes it. Auto-turning/autoattacking a retained target can trigger it.
// Deep Freeze cannot be prevented by running; its removal comes from fire.
// Failure: canceled WB2 element -> LOG SIGNAL: both breaths then no needed
// status, lethal later dive/DoT; FAULT: overlapped cone cause if proven;
// CONSEQUENCE: Major, Raid if terminal. The later dive victim may be fallout.
// Failure: wrong element/no cleanse -> LOG SIGNAL: wrong dragon hit, status
// persists or lethal damage/DoT; FAULT: group choice if free to move;
// CONSEQUENCE: Major, possibly terminal Solemn break.
// Failure: Pyretic action -> LOG SIGNAL: Pyretic damage near action/auto/
// movement then dive death; FAULT: actor if activity/cause visible;
// CONSEQUENCE: Major on caused death, Minor if harmless/no Damage Down.
// Failure: non-tank first -> LOG SIGNAL: enhanced lead hit/DoT on non-tank,
// followed by deaths; FAULT: tank too far back versus non-tank too far
// forward only with geometry/assignments; CONSEQUENCE: Major.
// Removal: opposite dive clears elemental condition. Burn/Frostbite on lead
// tanks persists and needs healing; invuln can prevent initial death without
// eliminating later ticks. Not errors: six intended solo breaths, retained
// statuses, Deep Freeze before cleanse, correct dive hits and lead-tank DoTs.
//
// -- TOUCHDOWN AND FINISH --
// What: Touchdown visual 27968, proximity helper 28903 from two landings.
// Nidhogg lands middle, Hraesvelgr S; party retreats N. Final Vow pass occurs
// near N after landing, not automatically back at center. Revenge of the
// Horde 27937 is a ~25s cast after landing; both HP floors release for finish.
// Correct: survive proximity and lingering tank DoTs, clear space for last
// pass if still active, defeat BOTH before either terminal enrage. If one
// dragon is finished first, keep healing opposite tank/DoTs and complete other.
// Failure: too near landing -> LOG SIGNAL: excessive source-specific
// proximity damage/death; FAULT: mover only if safe distance established;
// CONSEQUENCE: Major, Raid if terminal Solemn break. Failure: final check
// missed -> LOG SIGNAL: Revenge completes from surviving dragon;
// FAULT: raid damage/prior failures, player-less; CONSEQUENCE: Raid.
// Removal: successful phase end clears remaining objectives; absence of
// later Vow after cleanup is normal. P5 killed Thordan -> unwinnable Eyes
// branch after P6; that route error belongs to P5, not the dragon kill.
// Not errors: reduced-distance landing hits, one dragon finished first,
// final Vow receiver being initial holder after Atonement expires.
//
// -- STRATEGY AND NOT ERRORS --
// WB1 triangle/delta family: three pair positions; anchors hold, flexes swap
// if a pair has same element. Example Elemental SW H1+M1, SE H2+M2,
// lower-mid R1+R2; H1/H2/R2 anchor, M1/M2/R1 flex. Mana rearranges role
// pairs/anchors. A line/other three-pair arrangement is valid with safe cones
// and distance from BOTH dragons. Pair identity is not determined by job.
// Vow NA DTTMC = initial DPS -> tank1 -> tank2 -> eligible melee -> caster;
// Elemental/Mana DTTMR uses physical ranged last. Priority can favor tank
// self-healing or melee defensives, not a mandated job. Center first three
// passes, N-edge last is common. Original holder can legally take last.
// Wroth: spreads W/pairs E versus reversed; fixed role priority, conga,
// manual marks/self-marks, voice or automarkers all identify two pairs.
// Marker style is not a logged game requirement and may map pairs differently.
// WB2: static/fixed positions (NA, Mana, OCE), only tanks adjust for mouth
// branch; some non-tank tethers stay short by design. Alternative 5-1:
// five spread N, one ranged S (often R1), tank positions respond to mouths.
// Fixed example in T: H1 true N edge, H2 true S edge; M1 by NW corner of
// Nidhogg-side white floor tile, M2 between Hraesvelgr-side white tiles;
// R1 at S edge half-tile W of western tracks, R2 at N edge half-tile E of
// eastern tracks. Solo-buster tanks use NW near Nidhogg / SE near Hraesvelgr,
// inside hitboxes at donut intersection; both-glow tanks instead share mid.
// These floor landmarks describe a published layout, not measured world
// coordinates or the user's assigned slots; other static diagrams differ.
// Other reported static distributions (3-3, 4-2, 6-0) are layout families,
// not permission to cancel WB2 elements; exact slots need that group's plan.
// Final dives: tanks can be fixed W/E or assigned by dragon/invuln readiness.
// Double invuln is simple; conventional CDs save invulns for P7 6-1-1.
// Damage holds near HP floors, pre-balance target changes, element cleansing,
// expected DoTs and successful recovery LB after late enrage are valid.
//
// -- PULL ENDERS --
// Failed Vow with early enraged autos, Hraesvelgr-caused death leading to
// unrecoverable oath break, lethal Afah imbalance, Entangled Pyre cascades,
// missing elemental protection and final Revenge. A late oath break is not
// automatically unrecoverable; documented LB/shield recovery can reach P7.
// Pyretic or Suppuration existing is not itself Raid. Wrong-route P5 kill
// is already terminal to a clear attempt but should not create a new P6 blame.
//
// -- OPEN QUESTIONS --
// 1. Verify Vow/100s Atonement/Suppuration GUIDs and original expiry versus
//    early corpse explosion on death (IV/M conflict), pass selection and
//    missed-pass enrage events. Which exact player receives each transfer?
// 2. Resolve Afah 3% versus 2.8%/rounding, available boss HP at snapshot,
//    HP-floor release and enrage windows from successful/failed checks.
// 3. Map breath/element/DoT sources, short-tether distance curve, cancellation,
//    Pyretic activity and Deep Freeze, excluding the 7.0 malfunction period.
// 4. Verify Wroth own-spread no-damage, early death/insufficient-target Pyre,
//    pair minimum/overlap penalties, orb counts and puddle ownership.
// 5. Which source-specific deaths trigger Solemn, including ice DoT and
//    mixed damage? When are late vow breaks recoverable rather than Raid?
// 6. Verify first-in-line dive selection, tank DoT persistence/invuln behavior,
//    both landing origins, remaining Vow cleanup and final kill ordering.
// 7. Build from a kill and wipes for each breath, Wings, Vow, Afah, Wroth,
//    dive/landing and enrage branch. No static assignments or own logs supplied.
