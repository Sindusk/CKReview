// lib/mechanics/ffxiv/fru/usurper-of-frost.ts
//
// Futures Rewritten Phase 2 (Usurper of Frost and the crystal intermission)
// per-pull rules. Entry point: detectUsurperOfFrostErrors. Self-gates on
// Quadruple Slap / Diamond Dust, runs from the first non-P1 cast and stops
// at the first Phase 3 cast. The fallback model (fallback.ts
// MODULE_PHASES) stays out of P2.
//
// -- VERIFIED AGAINST LOGS (2026-10-12) --
// 19 reports from one static (Aug-Oct, week-by-week prog), 245 pulls that
// reached P2, 91 P2 clears (none past early P3), no VODs. Fetched with
// `--from-minutes 2.4 --to-minutes 7.75` (P2 and the intermission only).
// Report letters in date order: A YZrnL3M4TxDGqbVW, B pWk6jnCbPvgmKDY7,
// C Py82MngQfW7tZ1zq, D 4dJvwA1BfhzYTQP8, E zxkbv8Fpr1CwAga4,
// F H8QryYmRK4FqMgx1, G wT8cN6hZRnQYvzDq, H cwW2F4ZHK16MjTmh,
// I WbMPXrwh7n6ANtyx, J 1WHFLnD3KgYj89N4, K MtpqrnkzZhvRN6Ly,
// L t147Vwg3kYJdXcfZ, M DyXTbh4rcWZNqnfa, N p9dhrcBTPAG6ZHkm,
// O 4wgqj19PkzbT6Fy7, P GQT7NhqagWjt42JD, Q zqta7cBWKwM4fyTj,
// R rtahLj4dXxBM13y6, S ZkXwDLTnpcdt4KaA. Cited as A22 +40.0: pull number in
// the folder, seconds after P2's first cast (which lands 2:50-2:58 into the
// pull; P1 ends 2:37-2:46).
// Clock (every pull within ~0.5s, P2-relative): Quadruple Slap +0/+4.1,
// Diamond Dust +20.7, Axe or Scythe Kick +29.4-29.7 (the cast is logged only
// sometimes), cones +30.8, Frigid Stone +32.2, Icicle Impact +33/+37/+41,
// Heavenly Strike +36.3, Frigid Needle +39.0/+39.6, Sinbound Holy x4
// +40.9-45.7, Shining Armor +48.6 (Thin Ice +48.8), twin cleaves +56/+58,
// Hallowed Ray +68, Mirror, Mirror +77.7, Scythe Kick + first cones +93.3,
// red-mirror cones +103.2, Banish III +108, Light Rampant +117.4 (chains and
// the first Lightsteeped stack +118.3), first towers +129, Luminous Hammer
// +126-132, Powerful Light +135, Burst +137, center tower +144, Banish III
// +146.5, The House of Light (8 cones) +155.5, Absolute Zero +173.8, Endless
// Ice Age cast +200.3-200.9 (39.7s), Junction +252, P3 +270.
// Log IDs (the model's cactbot candidates were right):
// - Quadruple Slap 40191/40192 (two hits on the tank), Physical
//   Vulnerability Up 1004162. The static's tank invulnerables it in 241 of
//   242 pulls; S6 died to the second hit on Holy Sheltron + Esuna.
// - Diamond Dust 40197 (raidwide). Frigid Stone players carry head marker
//   345 (four, one role); their stones 40199 hit their owner (~40-60%),
//   dropping at their feet 8.1s after the marker. Icicle Impact 40198
//   begins 2, then 4 (+4.0s), then the last 2 (+8.0s, as the stones drop),
//   each landing 8.7s after its begincast, often from a different helper
//   than the one that began it (JZ1KXhDbqkNH3jxR 24, M9Nagmnw2LzHZPVq 1).
//   Frigid Needle begins 2.1s after the drop at each stone (4.7s cast):
//   two 40201 crosses (5y-wide lines, 40y arms; one cardinal, one
//   diagonal) and a 5y 40200 circle, shown in game as an 8-way star.
//   The House of Light 40206 cones target the four nearest (cast target =
//   player). Icicle Impact 40198, Axe Kick 40202, Scythe Kick 40203,
//   Frigid Needle 40200/40201 all give Damage Down. Heavenly Strike 40207
//   is the knockback.
// - Sinbound Holy 40209: four waves of two four-player stacks (694 of 721
//   waves with all eight alive were 4/4; the rest one player short).
//   Bleeding 1003077/1003078 (puddles after Holy, Luminous Hammer and
//   Hiemal Ray) ticks for ~90-230k and is logged as damage only when lethal.
//   The puddles glow on the floor in game (user, 2026-10-17); the log has
//   no actor for them, so their lifetime is unknown (the replay guesses 6s).
// - Shining Armor 40185 hits everyone for 0; looking at it gives Stun
//   1004163 + Damage Down (10 pulls). Thin Ice 1000911 +48.8 to ~+60.
//   Twin Stillness 40193 (first) / 40196 (second), Twin Silence 40195 /
//   40194: every hit lethal. No twin casts are logged.
// - Hallowed Ray 40211: 8 of 8 in all 138 resolutions with everyone alive
//   (target head marker 525).
// - Mirror, Mirror: eight single cones per volley (258 clean volleys);
//   Reflected Scythe Kick 40204/40205 hits give Damage Down. Banish III
//   pairs 40222 (cast 40220), spreads 40223 Banish III Divided (cast 40221).
// - Light Rampant 40212: Chains of Everlasting Light 1004157 on six,
//   Curse 1004158 after, The Weight of Light 1004159 on two of them, head
//   marker 375 on the two Luminous Hammer 40218 players (five drops each).
//   Towers Bright Hunger 40213. Lightsteeped 1002257 (the `stack` field on
//   applydebuffstack is the count): everyone ends on four after Light
//   Rampant's stack, the towers, Powerful Light 40217 (two stacks of four;
//   short -> Mark of Mortality 1004372), the center tower (the four on
//   two) and the eight final cones 40188. Refulgent Fate 40215 = a broken
//   tether, raid-wide Damage Down (a chained player dying, or a tether too
//   short at the chains-to-curses change, A3 +128.6). Inescapable
//   Illumination 40214 = a short center tower, raid-wide Damage Down plus a
//   stack. Lightsteep 40216 = a fifth stack exploding. Burst 40219 (holy
//   light) gives Damage Down and a stack.
// - Absolute Zero 40224 cast; 40333 is the normal raidwide, 40334 the
//   enrage (11 pulls, Shiva at 20.0-26.3%; every pass was at 20.0% or less).
// - Intermission: Hiemal Storm 40256 and Sinbound Blizzard III 40262 hits
//   give Damage Down; Hiemal Ray 40257 hits only its targets. Ice Veil gets
//   Vulnerability Down 1002198 when the light crystals die (+217-233) and
//   loses it at its death (+238.6-240.8). Endless Ice Age 40259 damage = the
//   Veil survived (18 pulls; G9 never killed the light crystals, I23 late).
// Failure findings:
// - First P2 deaths by killing blow: no killing blow 32, twin cleaves 20,
//   The House of Light 19 (Diamond Dust and Mirror, Mirror), Bleeding 18,
//   Frigid Stone 17, Burst 13, Icicle Impact 10.
// - Diamond Dust: a marked player taking a cone died to their own stone in
//   every case (8); a stone on the cone group always came from a marked
//   player standing in the middle (M8, Q10, I12, I18, J8, K5, G21).
// - With anyone dead: Diamond Dust, Hallowed Ray and Mirror, Mirror were
//   survived; Light Rampant never (9 of 9); Sinbound Holy about half.
// - No killing blow: Thin Ice strips at the death (slides, F6, I5), the
//   knockback, voluntary resets 12-34s after a player's own Damage Down,
//   the raid resetting within seconds of another death (B12 +36.3: six
//   into the wall 5s after one), and lone tanks at the wall in Mirror,
//   Mirror (F1 +102.3, R9, J19, O19) followed by the cones wiping the raid.
// - 3 dead at once ended every P2 wipe within 18s (G14).
// Cutoffs (first Raid error) of the 151 wipes: collapse 60, called wipe
// 21, Refulgent Fate 18, Endless Ice Age 18, Absolute Zero 11, center tower
// 11, fifth stack 9, dead going into Light Rampant 3. The 91 clears have
// none.
// VOD review 2026-10-12 (user): report T wdH8Az193bYxJTRf (the user's
// static, fatebreaker.ts's group A, 2025-01-11), pulls 1, 3, 4, 8, 13, 19,
// 20, 21, 25; rulings in expectations/rulings.json. Report T is cited in
// the same P2-relative seconds (its P2 starts 2:52-2:57). It set:
// - the Diamond Dust cone bait: the unmarked player who took no cone is
//   named, not the marked player it went to (T13 +30.8);
// - a Mirror, Mirror cone's aimer named alone (T20 +103.2);
// - the boss's spot as the tank's fault (T21 +92.7);
// - a missed Sinbound Holy always Major (T3 +45.7);
// - the fifth-stack mover (T4 +155.6);
// - lone knockback walls after a death (T19 +40.1);
// - a wall death before a mechanic death not being part of the called
//   wipe (T25 +87.6).
// - Refulgent Fate T8 (pull 5:03): per the user the summoner stood too close to
//   the sage (tether assignments went wrong). Not readable: at the
//   chains-to-curse change the closest chained pairs in failed pulls
//   (13.7-15.9y: A3, H2, T8, T18) overlap the clean ones (14.3y+), and the
//   tether partners aren't logged. It stays player-less.
// VOD review 2026-10-15 (user): report JZ1KXhDbqkNH3jxR (fatebreaker.ts's
// group J), pull 22: the PLD's no-killing-blow death in the crystal
// intermission (6:30) was the wall, as flagged; the DNC then took that
// player's Hiemal Ray tether and died to it (fallout, unflagged). Ruling
// in expectations/rulings.json.
// - Diamond Dust deaths: per the user the pull was over once the GNB died
//   in T19 Diamond Dust. On disk 11 of 46 pulls with a Diamond Dust death
//   still reached Hallowed Ray (T29 among them), so there is no cutoff for
//   it yet (asked).
//
// -- RULES IMPLEMENTED --
// ffxiv-uof-avoidable (Major on Damage Down or death, else Minor): Icicle
//   Impact, Axe/Scythe/Reflected Scythe Kick, Frigid Needle, the twin
//   cleaves (not while stunned by the gaze), Burst, Hiemal Storm, Sinbound
//   Blizzard III.
// ffxiv-uof-gaze (Major): Stun / Damage Down from Shining Armor.
// ffxiv-uof-marked-cone: a Frigid Stone player hit by a House of Light cone
//   (Major when they died). When the cone was aimed at them as one of the
//   four nearest while a living unmarked player took no cone,
//   ffxiv-uof-cone-bait names that unmarked player instead (too far out).
//   ffxiv-uof-stone: a stone hitting unmarked
//   players names the marked players it also hit (player-less without one).
// ffxiv-uof-overlap (all eight alive): a player hit by 2+ instances of a
//   Mirror, Mirror cone, Banish III Divided spread or final cone; everyone
//   sharing them named. Major if one of them died. House of Light cones:
//   when every shared cone has exactly one player hit by nothing else, that
//   player aimed it and is named alone ("Aimed ... Into Others").
// ffxiv-uof-boss-spot (Major): a boss Scythe Kick in Mirror, Mirror on 3+
//   players names the tank holding the boss (last auto); that volley's kick
//   and cone errors are dropped.
// ffxiv-uof-stack (all eight alive): a player in none or in two of Sinbound
//   Holy, Hallowed Ray, Banish III pairs, Powerful Light; a Holy taken alone
//   with 2+ missing also names its target. Major on a death or Mark of
//   Mortality, else Minor; a missed Sinbound Holy is always Major.
// ffxiv-uof-puddle: Bleeding (Minor; Major when it killed).
// ffxiv-uof-slap (Major): a tank killed by Quadruple Slap, or by an auto
//   under its vulnerability (both tanks).
// ffxiv-uof-refulgent-fate (Raid): Refulgent Fate on 3+ players.
// ffxiv-uof-center-tower (Raid + Major): Inescapable Illumination on 3+;
//   with everyone alive, the two-stack players (after Powerful Light) not in
//   the tower are named, except one a Burst pushed to three.
// ffxiv-uof-fifth-stack (Major + Raid): the player who reached five stacks,
//   with their stack history; not when the extra came from Inescapable
//   Illumination. Two who reached five from the same final cones: the one
//   on the side of the empty spot alone. Raid when it hit 3+.
// ffxiv-uof-wall (Major): no-killing-blow deaths: knockback (Heavenly
//   Strike, Swelling Frost), Thin Ice slide, else walked into the wall. Not
//   within 36s of the player's own Damage Down, not within 8s of another
//   death (except a lone knockback death), not with a dropped killing
//   blow, not a called wipe.
// ffxiv-uof-dead-going-in (Raid): someone dead when Light Rampant begins.
// ffxiv-uof-mark: a Mark of Mortality no error accounts for (common.ts).
// ffxiv-uof-enrage / -endless-ice-age (Raid): the timer checks.
// ffxiv-uof-called-wipe (3+ no-killing-blow deaths within 10s, or one in
//   the last 12s with 4+ dead; a first one followed by a mechanic death
//   before the next, with nobody dead in the 10s before it, is its own
//   mistake: common.ts resetCluster) / -collapse (3 dead, pull over within
//   25s): Raid, only the earliest, only before any mechanic Raid.
// Exposure: -slap targets both tanks, -marked-cone and -stone the four
// Frigid Stone players; everything else (-cone-bait, -boss-spot included)
// counts everyone.
// The Damage Down causes are excluded from ffxiv-damage-down (error-rules.ts).
// Not built: Hammer/tower overlaps, who stood too close in a short Light
// Rampant tether (Refulgent Fate stays player-less), a mirror cone's aimer
// when its target can't be told apart, the
// light/dark crystal kill order (no crystal buffs or deaths in the log),
// LR tower assignments, tank mitigation beyond deaths.
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
//
// ── OPEN QUESTIONS (VOD needed; moved from docs/open-items.md 2026-10-15) ──
// Built 2026-10-12 from 19 logs of one static (245 P2 pulls, 91 P2 clears)
// with no VODs (report T's VOD review above came after). These apply to any
// P2 pull; check them on the first VODs that reach P2:
//   - Tank dies with no killing blow in Mirror, Mirror (about 4:35 into the
//     pull, just before the red-mirror cones). Flagged "Walked Into the
//     Wall", and the cones then wipe the raid. Is it the wall while moving
//     the boss, or something else?
//   - [STALE?] Deaths into the wall within 8s of another death (the Heavenly
//     Strike knockback, or sliding on Thin Ice) are treated as the raid
//     resetting and not flagged. Right, or were some real mistakes? (Partly
//     answered: a lone knockback wall after a death is now flagged, T19
//     +40.1.)
//   - [STALE?] Sinbound Holy: one player out of a stack is a Minor ("Missed
//     Sinbound Holy", the most common stack error, usually nobody dies). When
//     a stack holds only its target and the other three are missing, all
//     four are named. Keep both? (Contradicted: a missed Sinbound Holy is now
//     always Major, T3 +45.7.)
//   - Two Frigid Stone players in one stone with nobody dying isn't flagged.
//     Should it be?
//   - Center tower short with nobody named (the raid marker only): who should
//     have been in it?
//   - Luminous Hammer players dying to Powerful Light (the hammers' magic
//     vulnerability, 3 pulls): healing, or should they wait to join the
//     stack?
//   - [STALE?] Refulgent Fate with nobody dead reads "a tether was too
//     short". Which pair, and is that the right reading? (T8 answered: the
//     summoner stood too close to the sage; still player-less, see above.)
//   - Bleeding without a death is a Minor ("Stood in a Puddle"). Keep it?
//   - Endless Ice Age is a player-less Raid: the log has no crystal deaths or
//     crystal buffs, only the Ice Veil's. What went wrong in those pulls
//     (light crystal shielded by a dark cone, dark crystal killed, too slow)?

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import type { ReportedOccurrence } from "@/lib/mechanics/occurrences";
import { kFmt, sec, yd, joinNames, playerError, playerlessMinor, raidMarker, clusterByGap } from "@/lib/mechanics/wow/common";
import {
  DAMAGE_DOWN, MARK_OF_MORTALITY, DEATH_EVENT_LAG_MS, PREVIEW_AMOUNT, type Hit, type Life,
  bodyHit, buildLife, hitsOf, castsOf, gotAura, clock, uniq, namesOf, isTank, realAmount, allAlive, byPlayer, resetCluster,
  unexplainedMarks,
} from "./common";

export const UOF_AVOIDABLE_RULE_ID   = "ffxiv-uof-avoidable";
export const UOF_GAZE_RULE_ID        = "ffxiv-uof-gaze";
export const UOF_CONE_RULE_ID        = "ffxiv-uof-marked-cone";
export const UOF_CONE_BAIT_RULE_ID   = "ffxiv-uof-cone-bait";
export const UOF_STONE_RULE_ID       = "ffxiv-uof-stone";
export const UOF_BOSS_SPOT_RULE_ID   = "ffxiv-uof-boss-spot";
export const UOF_OVERLAP_RULE_ID     = "ffxiv-uof-overlap";
export const UOF_STACK_RULE_ID       = "ffxiv-uof-stack";
export const UOF_PUDDLE_RULE_ID      = "ffxiv-uof-puddle";
export const UOF_SLAP_RULE_ID        = "ffxiv-uof-slap";
export const UOF_REFULGENT_RULE_ID   = "ffxiv-uof-refulgent-fate";
export const UOF_CENTER_RULE_ID      = "ffxiv-uof-center-tower";
export const UOF_FIFTH_RULE_ID       = "ffxiv-uof-fifth-stack";
export const UOF_WALL_RULE_ID        = "ffxiv-uof-wall";
export const UOF_DEAD_GOING_IN_RULE_ID = "ffxiv-uof-dead-going-in";
export const UOF_ENRAGE_RULE_ID      = "ffxiv-uof-enrage";
export const UOF_ICE_AGE_RULE_ID     = "ffxiv-uof-endless-ice-age";
export const UOF_CALLED_WIPE_RULE_ID = "ffxiv-uof-called-wipe";
export const UOF_COLLAPSE_RULE_ID    = "ffxiv-uof-collapse";
export const UOF_MARK_RULE_ID        = "ffxiv-uof-mark";

/** A head marker on a player (FFLogs headmarker events), ms into the pull. */
export type HeadMarker = { timestamp: number; player: string; markerId: number };

// ── log IDs (VERIFIED above) ────────────────────────────────────────────────

// Any caster outside these ends Phase 1 / Phase 2. P2's own actors include
// the crystals and Ice Veil of the intermission.
const P1_ACTOR = /^(Fatebreaker|Fatebreaker's image|halo of (flame|levin))$/;
const P2_ACTOR = /^(Usurper of Frost|oracle's reflection|frozen mirror|holy light|crystal of (light|darkness)|ice veil)$/;
const SIGNATURE = [40191, 40197];            // Quadruple Slap, Diamond Dust (casts)
const STONE_MARKER = 345;                    // Frigid Stone head marker
const DIAMOND_DUST = 40197;
const HOUSE_CONE = 40206;                    // The House of Light: Diamond Dust and Mirror, Mirror cones
const FINAL_CONES = 40188;                   // The House of Light: the eight cones after Light Rampant
const FRIGID_STONE = 40199;
const SLAP = [40191, 40192];
const AUTO = 40176;
const PHYS_VULN = 1004162;
const STUN = 1004163;
const SHINING_ARMOR = 40185;
const TWINS = [40193, 40194, 40195, 40196];
const THIN_ICE = 1000911;
const HOLY = 40209;
const HALLOWED_RAY = 40211;
const BANISH_PAIR = 40222;
const BANISH_SPREAD = 40223;
const LIGHT_RAMPANT = 40212;
const CHAINS = 1004157;
const CURSE = 1004158;
const BRIGHT_HUNGER = 40213;
const POWERFUL_LIGHT = 40217;
const REFULGENT_FATE = 40215;
const INESCAPABLE = 40214;
const LIGHTSTEEP = 40216;
const LIGHTSTEEPED = 1002257;
const BLEEDING = [1003077, 1003078];
const HEAVENLY_STRIKE = 40207;
const SWELLING_FROST = 40225;
const KNOCKBACKS = [HEAVENLY_STRIKE, SWELLING_FROST];
const AZ_ENRAGE = 40334;                     // Absolute Zero with Shiva at 20%+ (40333 is the normal one)
const ABSOLUTE_ZERO_CAST = 40224;
const ENDLESS_ICE_AGE = 40259;

type Avoidable = { name: string; hit: string; why: string };
const TWIN_WHY = "Twin Stillness hits the front and sides first, then the back (start behind her, then cross to her front); Twin Silence is the reverse. On Thin Ice every step slides, so start moving early.";
const KICK_WHY_SCYTHE = "Scythe Kick is a donut: only the small spot under the boss is safe.";
const AVOIDABLE: Record<number, Avoidable> = {
  40198: { name: "Icicle Impact", hit: "Hit by an Icicle Impact circle",
    why: "Diamond Dust drops eight ice circles in sets of 2, 4 and 2; stand where the earlier set already went off." },
  40202: { name: "Axe Kick", hit: "Hit by Axe Kick",
    why: "Axe Kick is a large circle around the boss: the cone baiters stand just past the outer ring, the marked players at the wall." },
  40203: { name: "Scythe Kick", hit: "Hit by Scythe Kick", why: KICK_WHY_SCYTHE },
  40204: { name: "Reflected Scythe Kick", hit: "Hit by a mirror's Reflected Scythe Kick",
    why: "Each mirror repeats Scythe Kick as a donut around itself; stand where its donut can't reach." },
  40205: { name: "Reflected Scythe Kick", hit: "Hit by a mirror's Reflected Scythe Kick",
    why: "Each mirror repeats Scythe Kick as a donut around itself; stand where its donut can't reach." },
  40200: { name: "Frigid Needle", hit: "Hit by Frigid Needle",
    why: "Each Frigid Stone puddle fires needles in a star; after the Heavenly Strike knockback, land in a gap between the needle lines." },
  40201: { name: "Frigid Needle", hit: "Hit by Frigid Needle",
    why: "Each Frigid Stone puddle fires needles in a star; after the Heavenly Strike knockback, land in a gap between the needle lines." },
  40193: { name: "Twin Stillness", hit: "Hit by Twin Stillness", why: TWIN_WHY },
  40196: { name: "Twin Stillness", hit: "Hit by Twin Stillness", why: TWIN_WHY },
  40194: { name: "Twin Silence", hit: "Hit by Twin Silence", why: TWIN_WHY },
  40195: { name: "Twin Silence", hit: "Hit by Twin Silence", why: TWIN_WHY },
  40219: { name: "Burst", hit: "Hit by a holy light's Burst",
    why: "The six holy lights explode in two waves of three; stay with your group and move into the spots where the first wave already went off. A Burst hit also adds a Lightsteeped stack." },
  40256: { name: "Hiemal Storm", hit: "Hit by Hiemal Storm",
    why: "Hiemal Storm circles drop on the players nearest the light crystals (the tanks and melee bait them); everyone else keeps away." },
  40262: { name: "Sinbound Blizzard III", hit: "Hit by a dark crystal's Sinbound Blizzard III",
    why: "The dark crystals' cones aim at the nearest players (the healers and ranged bait them, pointed outward between the light crystals); stay out of the others' cones." },
};

// Death event lag is DEATH_EVENT_LAG_MS (./common).
const EPISODE_MS          = 3000;
// A no-killing-blow death this long after a knockback cast was knocked into
// the deathwall (A22 +40.0: 3.6s after Heavenly Strike).
const KNOCKBACK_MIN_MS    = 2000;
const KNOCKBACK_MAX_MS    = 6000;
// A no-killing-blow death this soon after the player's own Damage Down is a
// voluntary reset: 12.1-23.4s in Diamond Dust (E23 ... C5), 26.7-33.9s in
// the intermission (N4, M10, Q14, D17).
const DD_RESET_MS         = 36_000;
// Thin Ice removed this close to a no-killing-blow death: slid into the wall
// (the death strips it; F6 +49.7, I5 +56.9).
const THIN_ICE_DEATH_MS   = 2500;
const CALLED_WIPE_END_MS  = 12_000;
const CALLED_WIPE_COUNT   = 3;
const CALLED_WIPE_WINDOW  = 10_000;
const CALLED_WIPE_RAID_DEAD = 4;
// A no-killing-blow death this soon after another player's death is the
// raid resetting, not a wall mistake (see detectWallDeaths).
const RESET_AFTER_DEATH_MS = 8000;
// 3 dead at once ended every P2 wipe within 18s (G14 the worst).
const COLLAPSE_DEAD_COUNT = 3;
const COLLAPSE_END_MS     = 25_000;
// A penalty that hit this many players is a raid-wide failure.
const RAID_HITS           = 3;
// A no-killing-blow death with a damage hit this soon before its event died
// to that hit (FFLogs dropped the killing blow).
const SILENT_HIT_MS       = 3500;
// Arena center (positions are centi-yalms).
const CENTER              = 10000;
// The center tower is the Bright Hunger this long after Light Rampant (the
// first six towers come ~12s after it, the center ~26s).
const CENTER_TOWER_AFTER_MS = 20_000;
// The cones and stones of Diamond Dust come within this long of its cast.
const DIAMOND_DUST_SPAN_MS = 20_000;

// ── helpers ─────────────────────────────────────────────────────────────────

const instKey = (e: PlayerEvent) => `${e.source}#${e.sourceInstance}`;
/** Hits grouped by the instance that dealt them. */
const byInstance = (hits: Hit[]) => {
  const m = new Map<string, Hit[]>();
  for (const h of hits) m.set(instKey(h.e), [...(m.get(instKey(h.e)) ?? []), h]);
  return [...m.values()];
};
const fromCenter = (e: PlayerEvent) => (e.x === undefined || e.y === undefined ? undefined : Math.hypot(e.x - CENTER, e.y - CENTER));

/** Holding the aura at `t` (applied before, not removed since). */
function holds(p: PlayerInfo, id: number, t: number): boolean {
  let on = false;
  for (const e of p.debuffs) {
    if (e.abilityId !== id || e.timestamp > t) continue;
    on = e.debuffStatus !== "removed";
  }
  return on;
}

/**
 * Lightsteeped stack count after each change. FFLogs logs a new stack as
 * remove + apply + applydebuffstack in one millisecond, so only a removal
 * with nothing after it in the same millisecond resets the count.
 */
function lightsteepedHistory(p: PlayerInfo): { t: number; n: number; cause?: string }[] {
  const evs = p.debuffs.filter((e) => e.abilityId === LIGHTSTEEPED);
  const out: { t: number; n: number; cause?: string }[] = [];
  let n = 0;
  evs.forEach((e, i) => {
    const sameMsAfter = evs.slice(i + 1).some((x) => x.timestamp === e.timestamp);
    if (e.debuffStatus === "removed") { if (!sameMsAfter) { n = 0; out.push({ t: e.timestamp, n }); } return; }
    n = e.debuffStatus === "stack" ? e.stack ?? n + 1 : e.debuffStatus === "applied" ? 1 : n;
    if (!sameMsAfter) out.push({ t: e.timestamp, n, cause: e.causeAbilityName });
  });
  return out;
}
const stacksAt = (p: PlayerInfo, t: number) => lightsteepedHistory(p).filter((h) => h.t <= t).pop()?.n ?? 0;

/** Took a listed avoidable hit within 2s of `t`: already flagged for it. */
function inAvoidable(p: PlayerInfo, t: number): boolean {
  return p.damageTaken.some((e) => AVOIDABLE[e.abilityId] && Math.abs(e.timestamp - t) <= 2000 && !bodyHit(e));
}

/** Phase 2's start (the first cast by a non-P1 actor) and end (the first cast by a P3 actor). */
function phase2Window(casts: EnemyEvent[]): { start: number; end: number } {
  const start = casts.filter((c) => !P1_ACTOR.test(c.actorName)).reduce((m, c) => Math.min(m, c.timestamp), Infinity);
  const end = casts.filter((c) => c.timestamp > start && !P1_ACTOR.test(c.actorName) && !P2_ACTOR.test(c.actorName))
    .reduce((m, c) => Math.min(m, c.timestamp), Infinity);
  return { start, end };
}

/** A player stunned by Shining Armor at `t` couldn't move: the gaze is the error. */
const stunnedAt = (p: PlayerInfo, t: number) => p.debuffs.some((e) => e.abilityId === STUN && e.debuffStatus === "applied" && e.timestamp <= t && t - e.timestamp < 8000);

// ── plain avoidable hits ────────────────────────────────────────────────────

function detectAvoidable(players: PlayerInfo[], life: Life, start: number, end: number): PullError[] {
  const errors: PullError[] = [];
  const ids = Object.keys(AVOIDABLE).map(Number);
  for (const p of players) {
    const hits = p.damageTaken.filter((e) => ids.includes(e.abilityId) && e.timestamp >= start && e.timestamp <= end && !bodyHit(e) && life.hitAlive(p, e.timestamp) &&
      (realAmount(e) > 0 || (e.amount ?? 0) >= PREVIEW_AMOUNT || gotAura(p, DAMAGE_DOWN, e.timestamp)) &&
      !(TWINS.includes(e.abilityId) && stunnedAt(p, e.timestamp)));
    for (const g of clusterByGap(hits, (e) => e.timestamp, EPISODE_MS)) {
      const kinds = uniq(g.map((e) => AVOIDABLE[e.abilityId]));
      const total = g.reduce((s, e) => s + realAmount(e), 0);
      const death = life.diedFrom(p, g[g.length - 1].timestamp);
      const dd = g.some((e) => gotAura(p, DAMAGE_DOWN, e.timestamp));
      const hit = kinds.map((k, i) => (i === 0 ? k.hit : k.hit.charAt(0).toLowerCase() + k.hit.slice(1))).join(", and ");
      const outcome = [dd ? "got Damage Down" : "", death ? "died" : ""].filter(Boolean).join(" and ");
      errors.push(playerError(p, {
        ruleId: UOF_AVOIDABLE_RULE_ID, severity: dd || death ? "Major" : "Minor", name: `Hit by ${uniq(kinds.map((k) => k.name)).join(" / ")}`,
        description: `${hit} (${g.length > 1 ? `${g.length} hits, ` : ""}${kFmt(total)}).${outcome ? ` They ${outcome}.` : ""} ${uniq(kinds.map((k) => k.why)).join(" ")}`,
        timestamp: g[0].timestamp, abilityId: g[0].abilityId, abilityName: g[0].abilityName,
      }));
    }
  }
  return errors;
}

// ── Shining Armor gaze ──────────────────────────────────────────────────────

/**
 * Looking at the outside Shiva's Shining Armor gives Stun and Damage Down
 * (cause Shining Armor); the stunned player usually dies to the twin
 * cleaves, which are then not flagged separately.
 */
function detectGaze(players: PlayerInfo[], life: Life, start: number, end: number): PullError[] {
  const errors: PullError[] = [];
  for (const p of players) {
    const evs = p.debuffs.filter((e) => e.debuffStatus === "applied" && e.timestamp >= start && e.timestamp <= end &&
      (e.abilityId === STUN || (e.abilityId === DAMAGE_DOWN && e.causeAbilityId === SHINING_ARMOR)));
    for (const g of clusterByGap(evs, (e) => e.timestamp, EPISODE_MS)) {
      const t = g[0].timestamp;
      const twin = p.damageTaken.find((e) => TWINS.includes(e.abilityId) && e.timestamp > t && e.timestamp - t < 15_000 && !bodyHit(e));
      const died = twin && life.diedFrom(p, twin.timestamp);
      errors.push(playerError(p, {
        ruleId: UOF_GAZE_RULE_ID, severity: "Major", name: "Looked at Shining Armor",
        description: `Faced the ice Shiva's Shining Armor gaze: Stun and Damage Down.${twin ? ` Still stunned, they were hit by ${twin.abilityName}${died ? " and died" : ""}.` : ""} Turn your back to the Shiva outside the arena before her gaze goes off.`,
        timestamp: t, abilityId: SHINING_ARMOR, abilityName: "Shining Armor",
      }));
    }
  }
  return errors;
}

// ── Diamond Dust: cones on marked players, stones on the cone group ─────────

/**
 * Diamond Dust marks one role's four players for Frigid Stone (head marker
 * 345); the other four, nearest the boss, take The House of Light's cones.
 * - A marked player hit by a cone stood among the cone baiters: magic
 *   vulnerability right before their own stone, which then killed them in
 *   every such pull (I8, D16, L9, C13, B18, N10, P5, B1).
 * - A stone that hit unmarked players landed on the cone group: every
 *   marked player that stone also hit was standing there (M8, Q10, I12,
 *   I18, J8, K5, G21). With no marked player in it, player-less.
 * A marked player in both is reported once, under the stone.
 */
function detectDiamondDust(players: PlayerInfo[], life: Life, casts: EnemyEvent[], markers: HeadMarker[], end: number, occurrences?: ReportedOccurrence[]): PullError[] {
  const errors: PullError[] = [];
  for (const dust of castsOf(casts, DIAMOND_DUST, end)) {
    const t0 = dust.timestamp, t1 = t0 + DIAMOND_DUST_SPAN_MS;
    const marked = new Set(markers.filter((m) => m.markerId === STONE_MARKER && m.timestamp >= t0 - 2000 && m.timestamp <= t1).map((m) => m.player));
    if (!marked.size) continue;
    const markedPlayers = players.filter((p) => marked.has(p.name));
    for (const key of [UOF_CONE_RULE_ID, UOF_STONE_RULE_ID]) occurrences?.push({ mechanicKey: key, timestamp: t0, players: markedPlayers.map((p) => p.name) });
    const inWin = (h: Hit) => h.e.timestamp >= t0 && h.e.timestamp <= t1;
    const cones = hitsOf(players, life, HOUSE_CONE, end).filter(inWin);
    const stones = hitsOf(players, life, FRIGID_STONE, end).filter(inWin);
    const stoneFlagged = new Set<PlayerInfo>();
    // Stones on the cone group.
    for (const hs of byInstance(stones)) {
      const victims = hs.filter((h) => !marked.has(h.p.name));
      if (!victims.length) continue;
      const owners = hs.filter((h) => marked.has(h.p.name));
      const killed = uniq(hs.filter((h) => life.diedFrom(h.p, h.e.timestamp)).map((h) => h.p));
      const sev = killed.length ? "Major" : "Minor";
      const outcome = killed.length ? ` ${namesOf(killed)} died (the cones' magic vulnerability makes a stone lethal).` : "";
      const t = hs[0].e.timestamp;
      if (!owners.length) {
        errors.push(playerlessMinor(UOF_STONE_RULE_ID, "Frigid Stone on the Cone Group",
          `A Frigid Stone landed on ${namesOf(victims.map((h) => h.p))}, who weren't marked for one.${outcome} The marked players drop their stones away from the cone baiters.`,
          t, FRIGID_STONE, "Frigid Stone"));
        continue;
      }
      for (const o of owners) {
        stoneFlagged.add(o.p);
        const d = fromCenter(o.e);
        const tookCone = cones.some((c) => c.p === o.p);
        errors.push(playerError(o.p, {
          ruleId: UOF_STONE_RULE_ID, severity: sev, name: "Dropped Frigid Stone on the Cone Group",
          description: `Had a Frigid Stone marker but stood with the cone baiters${d !== undefined ? ` (~${yd(d)} yalms from the center)` : ""}${tookCone ? ", taking a House of Light cone too," : ""} so the stone landed on ${namesOf(victims.map((h) => h.p))}.${outcome} Marked players move out to drop their stones away from the group in the middle.`,
          timestamp: t, abilityId: FRIGID_STONE, abilityName: "Frigid Stone",
        }));
      }
    }
    // Cones on marked players. When the cone was aimed at the marked player
    // as one of the four nearest while a living unmarked player took no cone,
    // that unmarked player stood too far out and is named instead (user,
    // 2026-10-12, T13 +30.8: the summoner wasn't close enough, the marked
    // healer was fine; PITFALLS: name whoever baited nothing).
    const coneTargets = new Set(castsOf(casts, HOUSE_CONE, end).filter((c) => c.timestamp >= t0 && c.timestamp <= t1).map((c) => c.target));
    const baitFlagged = new Set<PlayerInfo>();
    for (const [p, es] of byPlayer(cones)) {
      if (!marked.has(p.name) || stoneFlagged.has(p)) continue;
      const own = stones.find((h) => h.p === p);
      const died = life.diedFrom(p, (own ?? { e: es[0] }).e.timestamp);
      const skipped = players.filter((x) => !marked.has(x.name) && life.alive(x, es[0].timestamp) && !cones.some((c) => c.p === x));
      if (coneTargets.has(p.name) && skipped.length) {
        for (const s of skipped.filter((x) => !baitFlagged.has(x))) {
          baitFlagged.add(s);
          errors.push(playerError(s, {
            ruleId: UOF_CONE_BAIT_RULE_ID, severity: died ? "Major" : "Minor", name: "Too Far for the Cones",
            description: `Wasn't marked for Frigid Stone but took no House of Light cone: they stood farther from the boss than ${p.name}, who was marked, so a cone went to ${p.name} instead, with magic vulnerability right before their stone.${died ? ` ${p.name} died${own ? ` to ${own.e.abilityName}` : ""}.` : ""} The four unmarked players stand closest to the boss to take the cones.`,
            timestamp: es[0].timestamp, abilityId: HOUSE_CONE, abilityName: "The House of Light",
          }));
        }
        continue;
      }
      errors.push(playerError(p, {
        ruleId: UOF_CONE_RULE_ID, severity: died ? "Major" : "Minor", name: "Took a Cone While Marked",
        description: `Had a Frigid Stone marker but was hit by ${es.length > 1 ? `${es.length} House of Light cones` : "a House of Light cone"}${coneTargets.has(p.name) ? `, aimed at them as one of the four nearest the boss${skipped.length ? ` instead of ${namesOf(skipped)}` : ""}` : ""}: magic vulnerability right before their own stone.${died ? ` They died${own ? ` to ${own.e.abilityName}` : ""}.` : ""} Marked players stand a little farther from the boss than the cone baiters, and out of their lines.`,
        timestamp: es[0].timestamp, abilityId: HOUSE_CONE, abilityName: "The House of Light",
      }));
    }
  }
  return errors;
}

// ── one bait per player: cones and spreads ──────────────────────────────────

type Personal = { ids: number[]; name: string; what: string; why: string; skipMarked?: boolean; aimer?: boolean };
const PERSONAL: Personal[] = [
  { ids: [HOUSE_CONE], name: "The House of Light", what: "cone", skipMarked: true, aimer: true,
    why: "Each player baits one House of Light cone; two players on one line take both (magic vulnerability). In Mirror, Mirror the tanks and melee bait at the boss, the healers and ranged at the blue mirror, then each group at its nearest red mirror." },
  { ids: [BANISH_SPREAD], name: "Banish III Divided", what: "spread",
    why: "Banish III with four orbs is eight spreads: everyone takes their own." },
  { ids: [FINAL_CONES], name: "The House of Light", what: "cone",
    why: "After Light Rampant the eight House of Light cones go one per player; a second cone adds a Lightsteeped stack too." },
];

/**
 * With all eight alive (baits retarget onto the living after a death), a
 * player hit by two or more instances of a personal bait: everyone sharing
 * those instances is named (README philosophy 3). Diamond Dust cones on
 * marked players are detectDiamondDust's.
 */
function detectOverlaps(players: PlayerInfo[], life: Life, markers: HeadMarker[], start: number, end: number): PullError[] {
  const errors: PullError[] = [];
  const marked = new Set(markers.filter((m) => m.markerId === STONE_MARKER).map((m) => m.player));
  for (const fam of PERSONAL) {
    for (const res of clusterByGap(hitsOf(players, life, fam.ids, end).filter((h) => h.e.timestamp >= start), (h) => h.e.timestamp, 1000)) {
      const t0 = res[0].e.timestamp;
      if (!allAlive(players, life, t0 - 500)) continue;
      const per = byPlayer(res);
      const doubled = [...per].filter(([p, es]) => es.length > 1 && !(fam.skipMarked && marked.has(p.name) && t0 - start < 60_000));
      if (!doubled.length) continue;
      const involved = new Map<PlayerInfo, PlayerEvent[]>(doubled);
      for (const [, es] of doubled) {
        const keys = new Set(es.map(instKey));
        for (const h of res) if (keys.has(instKey(h.e)) && !involved.has(h.p)) involved.set(h.p, per.get(h.p)!);
      }
      const killed = [...involved.keys()].filter((p) => life.diedFrom(p, involved.get(p)!.slice(-1)[0].timestamp));
      // A cone hits its own baiter first, so a shared cone with exactly one
      // player hit by nothing else was that player's, aimed through the
      // others; the doubled players stood in their own spots (user,
      // 2026-10-12, T20 +103.2: the ninja's cone crossed into the boss group,
      // the three it doubled were correct). Only them, when every shared
      // cone has such an owner.
      if (fam.aimer) {
        const shared = byInstance(res).filter((hs) => uniq(hs.map((h) => h.p)).length > 1);
        const owners = shared.map((hs) => uniq(hs.map((h) => h.p)).filter((p) => per.get(p)!.length === 1));
        if (shared.length && owners.every((o) => o.length === 1)) {
          for (const [i, [owner]] of owners.entries()) {
            const victims = uniq(shared[i].map((h) => h.p)).filter((p) => p !== owner);
            const dead = victims.filter((p) => killed.includes(p));
            errors.push(playerError(owner, {
              ruleId: UOF_OVERLAP_RULE_ID, severity: killed.length ? "Major" : "Minor", name: `Aimed ${fam.name} Into Others`,
              description: `Their ${fam.name} ${fam.what} also hit ${namesOf(victims)}, who took it on top of their own${dead.length ? `; ${namesOf(dead)} died` : ""}. ${fam.why}`,
              timestamp: t0, abilityId: shared[i][0].e.abilityId, abilityName: shared[i][0].e.abilityName,
            }));
          }
          continue;
        }
      }
      for (const [p, es] of involved) {
        const mine = new Set(es.map(instKey));
        const others = uniq(res.filter((h) => h.p !== p && mine.has(instKey(h.e))).map((h) => h.p));
        const death = killed.includes(p);
        errors.push(playerError(p, {
          ruleId: UOF_OVERLAP_RULE_ID, severity: killed.length ? "Major" : "Minor", name: `${fam.name} Overlap`,
          description: `${es.length > 1 ? `Took ${es.length} ${fam.name} ${fam.what}s` : `Shared a ${fam.name} ${fam.what}`} (${kFmt(es.reduce((s, e) => s + realAmount(e), 0))})${others.length ? ` with ${namesOf(others)}` : ""}${death ? " and died" : killed.length ? `; ${namesOf(killed)} died` : ""}. ${fam.why}`,
          timestamp: t0, abilityId: es[0].abilityId, abilityName: es[0].abilityName,
        }));
      }
    }
  }
  return errors;
}

// ── shared stacks ───────────────────────────────────────────────────────────

type Stack = { id: number; name: string; size: number; why: string };
const STACKS: Stack[] = [
  { id: HOLY, name: "Sinbound Holy", size: 4,
    why: "Sinbound Holy is four stacks in a row on the healers, four players each: stay with your group and move together after each." },
  { id: HALLOWED_RAY, name: "Hallowed Ray", size: 8,
    why: "Hallowed Ray is a line stack for all eight on its target." },
  { id: BANISH_PAIR, name: "Banish III", size: 2,
    why: "Banish III with one orb is four pairs: stand with your partner." },
  { id: POWERFUL_LIGHT, name: "Powerful Light", size: 4,
    why: "Powerful Light is two four-player stacks; fewer than four gives everyone in it Mark of Mortality." },
];

/**
 * With all eight alive: a player in none of a resolution's stacks missed it
 * (named), a player in two doubled up (named). A short Holy stack with only
 * its target and two or more missing names the target too: one player
 * leaving and three leaving look alike in the log (R7 +42.4). Major when
 * someone in the resolution died or got Mark of Mortality, else Minor; a
 * missed Sinbound Holy is always Major.
 */
function detectStacks(players: PlayerInfo[], life: Life, start: number, end: number): PullError[] {
  const errors: PullError[] = [];
  for (const st of STACKS) {
    for (const res of clusterByGap(hitsOf(players, life, st.id, end).filter((h) => h.e.timestamp >= start), (h) => h.e.timestamp, 800)) {
      const t0 = res[0].e.timestamp;
      if (!allAlive(players, life, t0 - 500)) continue;
      const per = byPlayer(res);
      const insts = byInstance(res).map((hs) => uniq(hs.map((h) => h.p)));
      const mom = players.filter((p) => gotAura(p, MARK_OF_MORTALITY, t0));
      const killed = uniq(res.filter((h) => life.diedFrom(h.p, h.e.timestamp)).map((h) => h.p));
      const sev = mom.length || killed.length ? "Major" : "Minor";
      const outcome = `${mom.length ? ` ${namesOf(mom)} got Mark of Mortality.` : ""}${killed.length ? ` ${namesOf(killed)} died.` : ""}`;
      for (const [p, es] of per) {
        if (es.length < 2 || new Set(es.map(instKey)).size < 2) continue;
        errors.push(playerError(p, {
          ruleId: UOF_STACK_RULE_ID, severity: sev, name: `Doubled ${st.name}`,
          description: `Stood in ${es.length} ${st.name} stacks at once (${kFmt(es.reduce((s, e) => s + realAmount(e), 0))}).${outcome} ${st.why}`,
          timestamp: t0, abilityId: st.id, abilityName: st.name,
        }));
      }
      const missing = players.filter((p) => !per.has(p) && !inAvoidable(p, t0));
      const short = insts.filter((ps) => ps.length < st.size);
      // Leaving a Sinbound Holy stack is Major even when its three survive
      // (user, 2026-10-12, T3 +45.7: the picto out of the stacks).
      for (const p of missing) {
        errors.push(playerError(p, {
          ruleId: UOF_STACK_RULE_ID, severity: st.id === HOLY ? "Major" : sev, name: `Missed ${st.name}`,
          description: `Wasn't in ${st.size === 8 ? "the" : "any"} ${st.name} stack${short.length ? `, so ${namesOf(short.flat())} took it short` : ""}.${outcome} ${st.why}`,
          timestamp: t0, abilityId: st.id, abilityName: st.name,
        }));
      }
      if (st.id === HOLY && missing.length >= 2) {
        for (const [alone] of insts.filter((ps) => ps.length === 1)) {
          errors.push(playerError(alone, {
            ruleId: UOF_STACK_RULE_ID, severity: sev, name: "Alone in Sinbound Holy",
            description: `Took a Sinbound Holy alone while ${namesOf(missing)} weren't in any stack: either they left their group or the group left them.${outcome} ${st.why}`,
            timestamp: t0, abilityId: st.id, abilityName: st.name,
          }));
        }
      }
    }
  }
  return errors;
}

// ── lingering puddles (Bleeding) ────────────────────────────────────────────

/**
 * Sinbound Holy, Luminous Hammer and Hiemal Ray leave puddles that inflict
 * Bleeding, which ticks for ~90-230k. Dying to it is Major; a non-lethal
 * Bleeding is Minor (no Damage Down).
 */
function detectPuddles(players: PlayerInfo[], life: Life, deaths: DeathEvent[], start: number, end: number): PullError[] {
  const errors: PullError[] = [];
  for (const p of players) {
    const apps = p.debuffs.filter((e) => BLEEDING.includes(e.abilityId) && e.debuffStatus === "applied" && e.timestamp >= start && e.timestamp <= end && life.alive(p, e.timestamp));
    for (const g of clusterByGap(apps, (e) => e.timestamp, 10_000)) {
      const t = g[0].timestamp;
      const death = deaths.find((d) => d.player === p.name && BLEEDING.includes(d.killingAbilityGameId ?? 0) && d.timestamp >= t && d.timestamp - t < 15_000);
      const recent = (id: number, ms: number) => players.some((x) => x.damageTaken.some((e) => e.abilityId === id && e.timestamp <= t && t - e.timestamp < ms));
      const source = recent(HOLY, 15_000) ? "Sinbound Holy's puddles" : recent(40218, 15_000) ? "a Luminous Hammer puddle" : recent(40257, 15_000) ? "a Hiemal Ray puddle" : "a puddle";
      errors.push(playerError(p, {
        ruleId: UOF_PUDDLE_RULE_ID, severity: death ? "Major" : "Minor", name: death ? "Died in a Puddle" : "Stood in a Puddle",
        description: `Stood in ${source} and got Bleeding${death ? ", which killed them" : ""}. Step out of the puddles as soon as they appear.`,
        timestamp: t, abilityId: g[0].abilityId, abilityName: "Bleeding",
      }));
    }
  }
  return errors;
}

// ── Quadruple Slap ──────────────────────────────────────────────────────────

/**
 * Two physical hits on the top-enmity tank, then ~16s of Physical
 * Vulnerability Up. The static invulnerables it every pull (241 of 242);
 * a tank killed by a Slap hit is their mitigation, a tank killed by an
 * auto under the vulnerability is the swap/invuln plan (both tanks named).
 * A Slap on a non-tank means a tank was dead: fallout.
 */
function detectSlap(players: PlayerInfo[], life: Life, deaths: DeathEvent[], start: number, end: number, occurrences?: ReportedOccurrence[]): PullError[] {
  const errors: PullError[] = [];
  const tanks = players.filter(isTank);
  for (const h of hitsOf(players, life, SLAP[0], end).filter((x) => x.e.timestamp >= start)) {
    occurrences?.push({ mechanicKey: UOF_SLAP_RULE_ID, timestamp: h.e.timestamp, players: tanks.map((p) => p.name) });
    if (!isTank(h.p)) continue;
    const death = deaths.find((d) => d.player === h.p.name && d.timestamp > h.e.timestamp && d.timestamp - h.e.timestamp < 20_000);
    if (!death) continue;
    if (SLAP.includes(death.killingAbilityGameId ?? 0)) {
      errors.push(playerError(h.p, {
        ruleId: UOF_SLAP_RULE_ID, severity: "Major", name: "Died to Quadruple Slap",
        description: "Died to Quadruple Slap: two heavy physical hits ~4s apart. It needs an invulnerability, or big mitigation plus a cleanse of the Physical Vulnerability Up between the hits.",
        timestamp: death.timestamp - DEATH_EVENT_LAG_MS, abilityId: SLAP[1], abilityName: "Quadruple Slap",
      }));
    } else if (death.killingAbilityGameId === AUTO && holds(h.p, PHYS_VULN, death.timestamp - DEATH_EVENT_LAG_MS)) {
      for (const p of tanks) {
        errors.push(playerError(p, {
          ruleId: UOF_SLAP_RULE_ID, severity: "Major", name: "Quadruple Slap Vulnerability",
          description: `${h.p.name} took an auto-attack under Quadruple Slap's Physical Vulnerability Up and died. Invulnerable through it, cleanse it, or swap so the other tank takes the autos.`,
          timestamp: death.timestamp - DEATH_EVENT_LAG_MS, abilityId: AUTO, abilityName: "Attack",
        }));
      }
    }
  }
  return errors;
}

// ── Light Rampant ───────────────────────────────────────────────────────────

/**
 * Refulgent Fate hits the whole raid when a Chains / Curse of Everlasting
 * Light tether breaks: a chained player died (Burst, the wall, already
 * dead at Light Rampant), or a tether was too short when the chains became
 * curses (A3 +128.6). Always the cutoff; the death is flagged by its cause.
 */
function detectRefulgentFate(players: PlayerInfo[], life: Life, deaths: DeathEvent[], start: number, end: number): PullError[] {
  const errors: PullError[] = [];
  for (const res of clusterByGap(hitsOf(players, life, REFULGENT_FATE, end).filter((h) => h.e.timestamp >= start), (h) => h.e.timestamp, 3000)) {
    const t = res[0].e.timestamp;
    if (uniq(res.map((h) => h.p)).length < RAID_HITS) continue;
    const chained = players.filter((p) => holds(p, CHAINS, t - 500) || holds(p, CURSE, t - 500) ||
      p.debuffs.some((e) => (e.abilityId === CHAINS || e.abilityId === CURSE) && e.debuffStatus === "removed" && Math.abs(e.timestamp - t) < 3000));
    const dead = deaths.filter((d) => chained.some((p) => p.name === d.player) && d.timestamp - DEATH_EVENT_LAG_MS <= t + 500 && d.timestamp - DEATH_EVENT_LAG_MS >= t - 60_000);
    const killed = players.filter((p) => res.some((h) => h.p === p && life.diedFrom(p, h.e.timestamp)));
    const why = dead.length
      ? `${joinNames(uniq(dead.map((d) => d.player)))} died while chained by Light Rampant, which broke their tether`
      : "A Light Rampant tether broke: two chained players were too close when the chains turned into curses";
    errors.push(raidMarker(UOF_REFULGENT_RULE_ID, "Refulgent Fate",
      `${why}. Refulgent Fate hit ${uniq(res.map((h) => h.p)).length} players with Damage Down${killed.length ? `; ${namesOf(killed)} died` : ""}. Unresolvable from here; treated as the cutoff point. The chained players keep their tethers stretched and stay alive until the curses expire.`,
      t, REFULGENT_FATE, "Refulgent Fate"));
  }
  return errors;
}

/**
 * The center tower (the Bright Hunger ~26s after Light Rampant) needs the
 * four players with two Lightsteeped stacks. With fewer soakers it fails
 * as Inescapable Illumination on everyone: Damage Down and a stack each
 * (B23, D5, E26, F16 had three soakers). With all eight alive the
 * two-stack players outside it are named; always a Raid marker.
 */
function detectCenterTower(players: PlayerInfo[], life: Life, casts: EnemyEvent[], start: number, end: number): PullError[] {
  const errors: PullError[] = [];
  const lr = castsOf(casts, LIGHT_RAMPANT, end).find((c) => c.timestamp >= start);
  if (!lr) return errors;
  const tower = clusterByGap(hitsOf(players, life, BRIGHT_HUNGER, end).filter((h) => h.e.timestamp >= lr.timestamp + CENTER_TOWER_AFTER_MS), (h) => h.e.timestamp, 1000)[0];
  const fail = clusterByGap(hitsOf(players, life, INESCAPABLE, end).filter((h) => h.e.timestamp >= lr.timestamp), (h) => h.e.timestamp, 1500)
    .find((r) => uniq(r.map((h) => h.p)).length >= RAID_HITS);
  if (!fail) return errors;
  const t = fail[0].e.timestamp;
  const tt = tower?.[0].e.timestamp ?? t - 2000;
  const soakers = uniq((tower ?? []).map((h) => h.p));
  // The soakers are the players on two stacks after Powerful Light. One
  // pushed to three by a Burst hit had to stay out (B23 +139.8): that Burst
  // is already flagged. With anyone dead the tower was short for that
  // reason: fallout.
  const pl = hitsOf(players, life, POWERFUL_LIGHT, end).find((h) => h.e.timestamp >= lr.timestamp);
  const expected = pl ? players.filter((p) => stacksAt(p, pl.e.timestamp + 1000) === 2) : players.filter((p) => stacksAt(p, tt - 100) === 2);
  const absent = allAlive(players, life, tt - 500) ? expected.filter((p) => !soakers.includes(p)) : [];
  const bursted = absent.filter((p) => lightsteepedHistory(p).some((h) => h.cause === "Burst" && h.t < tt));
  const owed = absent.filter((p) => !bursted.includes(p));
  for (const p of owed) {
    errors.push(playerError(p, {
      ruleId: UOF_CENTER_RULE_ID, severity: "Major", name: "Missed the Center Tower",
      description: `Had two Lightsteeped stacks but wasn't in the center tower, so only ${soakers.length} soaked it (${namesOf(soakers) || "nobody"}). It went off as Inescapable Illumination: Damage Down and a stack for the whole raid. The four players with two stacks take the center tower; those with three stay out.`,
      timestamp: tt, abilityId: BRIGHT_HUNGER, abilityName: "Bright Hunger",
    }));
  }
  const dead = players.filter((p) => !life.alive(p, tt));
  errors.push(raidMarker(UOF_CENTER_RULE_ID, "Center Tower Failed",
    `The center tower had ${soakers.length} of 4 soakers${dead.length ? ` (${namesOf(dead)} dead)` : ""}${bursted.length ? ` (${namesOf(bursted)} had a third stack from a Burst hit and had to stay out)` : ""}: Inescapable Illumination gave the raid Damage Down and an extra Lightsteeped stack. Unresolvable from here; treated as the cutoff point.`,
    t, INESCAPABLE, "Inescapable Illumination"));
  return errors;
}

/**
 * A fifth Lightsteeped stack explodes as Lightsteep on everyone nearby.
 * The player who reached five is named with where their stacks came from
 * (an extra from Burst, two final cones, or the center tower with three).
 * Not when the extra came from Inescapable Illumination: that raid-wide
 * stack is the center tower's failure (R12). A Raid marker follows when it
 * hit RAID_HITS+ players.
 */
function detectFifthStack(players: PlayerInfo[], life: Life, start: number, end: number): PullError[] {
  const errors: PullError[] = [];
  for (const res of clusterByGap(hitsOf(players, life, LIGHTSTEEP, end).filter((h) => h.e.timestamp >= start), (h) => h.e.timestamp, 1500)) {
    const t = res[0].e.timestamp;
    const five = players.filter((p) => lightsteepedHistory(p).some((h) => h.n >= 5 && h.t <= t + 200 && t - h.t < 3000));
    const fromRaidStack = (p: PlayerInfo) => lightsteepedHistory(p).some((h) => h.cause === "Inescapable Illumination" && h.t < t);
    const hit = uniq(res.map((h) => h.p));
    const killed = hit.filter((p) => life.diedFrom(p, t));
    const owed = five.filter((x) => !fromRaidStack(x));
    const mover = owed.length === 2 ? offSpotOfPair(players, owed as [PlayerInfo, PlayerInfo], t) : undefined;
    for (const p of mover ? [mover] : owed) {
      const hist = lightsteepedHistory(p).filter((h) => h.t <= t + 200 && h.n > 0);
      const steps = hist.map((h) => `${h.n} from ${h.cause ?? "Light Rampant"} (${clock(h.t)})`).join(", ");
      errors.push(playerError(p, {
        ruleId: UOF_FIFTH_RULE_ID, severity: "Major", name: "Fifth Lightsteeped Stack",
        description: `Reached five Lightsteeped stacks and exploded as Lightsteep on ${namesOf(hit.filter((x) => x !== p)) || "nobody else"}${killed.length ? `; ${namesOf(killed)} died` : ""}. Their stacks: ${steps}. Everyone should end Light Rampant on four: avoid Burst, take one final cone, and skip the center tower with three.`,
        timestamp: t, abilityId: LIGHTSTEEP, abilityName: "Lightsteep",
      }));
    }
    if (hit.length >= RAID_HITS || killed.length) {
      errors.push(raidMarker(UOF_FIFTH_RULE_ID, "Lightsteep Exploded",
        `A fifth Lightsteeped stack exploded on ${hit.length} players${killed.length ? `; ${namesOf(killed)} died` : ""}. Treated as the cutoff point.`,
        t, LIGHTSTEEP, "Lightsteep"));
    }
  }
  return errors;
}

/**
 * Two players who reached five together from the same final cones stood in
 * one spot of the eight-way layout around the boss. The one who left their
 * spot is the one next to the empty one: of the gaps between consecutive
 * players' bearings, the pair's widest outer gap is on the mover's side
 * (user, 2026-10-12, T4 +155.6: the ninja went to the wrong spot and
 * overlapped the sage, who was fine; bearings 25 degrees apart, the ninja's
 * outer gap 62 degrees, the sage's 48). Undefined (both named) without all
 * eight placed, or with the outer gaps within 10 degrees of each other.
 */
function offSpotOfPair(players: PlayerInfo[], pair: [PlayerInfo, PlayerInfo], t: number): PlayerInfo | undefined {
  const fromCones = (p: PlayerInfo, id: number) => p.damageTaken.filter((e) => e.abilityId === id && e.timestamp >= t - 1000 && e.timestamp - t < 3000).length >= 2;
  if (!pair.every((p) => fromCones(p, FINAL_CONES))) return undefined;
  const bearing = new Map<PlayerInfo, number>();
  for (const p of players) {
    const e = p.damageTaken.find((x) => x.abilityId === FINAL_CONES && x.timestamp >= t - 1000 && x.timestamp - t < 3000 && x.x !== undefined && x.y !== undefined);
    if (e) bearing.set(p, (Math.atan2(e.y! - CENTER, e.x! - CENTER) * 180 / Math.PI + 360) % 360);
  }
  if (bearing.size !== 8) return undefined;
  const sorted = [...bearing].sort((a, b) => a[1] - b[1]);
  const gapAfter = (i: number) => ((sorted[(i + 1) % 8][1] - sorted[i][1]) + 360) % 360;
  const outer = pair.map((p) => {
    const i = sorted.findIndex(([q]) => q === p);
    const prev = sorted[(i + 7) % 8][0], next = sorted[(i + 1) % 8][0];
    // The gap on the side away from the partner.
    return next === pair.find((q) => q !== p) ? gapAfter((i + 7) % 8) : prev === pair.find((q) => q !== p) ? gapAfter(i) : NaN;
  });
  if (outer.some(Number.isNaN) || Math.abs(outer[0] - outer[1]) < 10) return undefined;
  return outer[0] > outer[1] ? pair[0] : pair[1];
}

// ── Mirror, Mirror: the boss's spot ─────────────────────────────────────────

/**
 * In Mirror, Mirror the tank holds the boss opposite the blue mirror, and its
 * Scythe Kick donut hits nobody who stands at their bait. One that hit
 * BOSS_SPOT_HITS+ players means the boss was in the wrong spot: the tank
 * holding it (the last auto-attack's target) is named, and that volley's
 * kick and cone hits are fallout (user, 2026-10-12, T21 +92.7: five in the
 * donut, the boss ~10y off center next to a mirror). No other Scythe Kick
 * on disk (both statics) hit more than two players. Returns the
 * errors and the window whose avoidable / overlap errors to drop.
 */
const BOSS_SPOT_HITS = 3;
function detectBossSpot(players: PlayerInfo[], life: Life, casts: EnemyEvent[], end: number): { errors: PullError[]; windows: [number, number][] } {
  const errors: PullError[] = [];
  const windows: [number, number][] = [];
  const reflected = castsOf(casts, [40204, 40205], end);
  for (const res of clusterByGap(hitsOf(players, life, 40203, end), (h) => h.e.timestamp, 1500)) {
    const t = res[0].e.timestamp;
    const hit = uniq(res.map((h) => h.p));
    if (hit.length < BOSS_SPOT_HITS || !reflected.some((c) => Math.abs(c.timestamp - t) < 3000)) continue;
    const auto = players.filter(isTank).flatMap((p) => p.damageTaken.filter((e) => e.abilityId === AUTO && e.timestamp <= t + 1000).map((e) => ({ p, t: e.timestamp })))
      .sort((a, b) => b.t - a.t)[0];
    windows.push([t - 1500, t + 1500]);
    const killed = hit.filter((p) => life.diedFrom(p, t));
    const why = `Scythe Kick hit ${hit.length} players (${namesOf(hit)})${killed.length ? `; ${namesOf(killed)} died` : ""}: the boss wasn't where the groups bait their cones, so its donut and the mirrors' cones landed on them.`;
    if (auto) {
      errors.push(playerError(auto.p, {
        ruleId: UOF_BOSS_SPOT_RULE_ID, severity: "Major", name: "Boss in the Wrong Spot",
        description: `Held the boss in the wrong spot for Mirror, Mirror. ${why} The tank pulls the boss opposite the blue mirror before the kicks.`,
        timestamp: t, abilityId: 40203, abilityName: "Scythe Kick",
      }));
    } else {
      errors.push(playerlessMinor(UOF_BOSS_SPOT_RULE_ID, "Boss in the Wrong Spot", `${why} The tank pulls the boss opposite the blue mirror before the kicks.`, t, 40203, "Scythe Kick"));
    }
  }
  return { errors, windows };
}

// ── a mechanic started with someone dead ────────────────────────────────────

/**
 * Light Rampant chains six players and marks the other two; with anyone
 * dead it ended every pull (Refulgent Fate, or a short stack: 9 of 9).
 * Diamond Dust, Hallowed Ray and Mirror, Mirror were survived one down, so
 * only Light Rampant is a cutoff here.
 */
function detectDeadGoingIn(players: PlayerInfo[], life: Life, casts: EnemyEvent[], start: number, end: number): PullError[] {
  const lr = castsOf(casts, LIGHT_RAMPANT, end).find((c) => c.timestamp >= start);
  if (!lr) return [];
  const dead = players.filter((p) => !life.alive(p, lr.timestamp - 500));
  if (!dead.length) return [];
  return [raidMarker(UOF_DEAD_GOING_IN_RULE_ID, "Player Dead Going Into Light Rampant",
    `${namesOf(dead)} ${dead.length === 1 ? "was" : "were"} still dead when Light Rampant began. It chains six players and marks the other two, so it's unresolvable from here; treated as the cutoff point.`,
    lr.timestamp - 500, LIGHT_RAMPANT, "Light Rampant")];
}

// ── deaths with no killing blow ─────────────────────────────────────────────

const knockbackOf = (casts: EnemyEvent[], d: DeathEvent, end: number) =>
  castsOf(casts, KNOCKBACKS, end).filter((c) => d.timestamp - c.timestamp >= KNOCKBACK_MIN_MS && d.timestamp - c.timestamp <= KNOCKBACK_MAX_MS).pop();

/** The death stripped Thin Ice: the player slid into the wall during the gaze / twin cleaves. */
const slidOnIce = (players: PlayerInfo[], d: DeathEvent) => players.find((p) => p.name === d.player)?.debuffs
  .some((e) => e.abilityId === THIN_ICE && e.debuffStatus === "removed" && Math.abs(e.timestamp - (d.timestamp - DEATH_EVENT_LAG_MS)) <= THIN_ICE_DEATH_MS) ?? false;

/** A voluntary reset: a no-killing-blow death within DD_RESET_MS of the player's own Damage Down. */
const ddReset = (players: PlayerInfo[], d: DeathEvent) => players.find((p) => p.name === d.player)?.debuffs
  .some((e) => e.abilityId === DAMAGE_DOWN && e.debuffStatus === "applied" && e.timestamp < d.timestamp && d.timestamp - e.timestamp <= DD_RESET_MS) ?? false;

/**
 * No-killing-blow deaths that are the wipe being called, not mistakes: 3+
 * within 10s, or one in the pull's last 12s with half the raid already
 * dead (the tanks resetting). `pullEnd` is Infinity when the pull went on
 * to Phase 3. A lone tank walking into the wall in Mirror, Mirror (F1
 * +104.3) also ends the pull within seconds, so the end alone isn't enough.
 * Knockbacks and Thin Ice slides never count: the raid often reset seconds
 * after a slide it couldn't recover from (J17 +57.2, Q19 +59.1).
 */
function calledWipeDeaths(deaths: DeathEvent[], casts: EnemyEvent[], life: Life, players: PlayerInfo[], pullEnd: number, end: number): Set<DeathEvent> {
  const silent = deaths.filter((d) => !d.killingAbilityGameId && !knockbackOf(casts, d, end) && (ddReset(players, d) || !slidOnIce(players, d)));
  const out = new Set<DeathEvent>();
  const deadAt = (t: number) => players.filter((p) => !life.alive(p, t)).length;
  for (const d of silent) {
    if (pullEnd - d.timestamp <= CALLED_WIPE_END_MS && deadAt(d.timestamp - DEATH_EVENT_LAG_MS - 200) >= CALLED_WIPE_RAID_DEAD) out.add(d);
    const near = resetCluster(silent.filter((x) => Math.abs(x.timestamp - d.timestamp) <= CALLED_WIPE_WINDOW), deaths);
    if (near.length >= CALLED_WIPE_COUNT) near.forEach((x) => out.add(x));
  }
  return new Set(resetCluster([...out], deaths));
}

/**
 * The arena edge is a deathwall. A no-killing-blow death is (in order):
 * a knockback into it (Heavenly Strike, Swelling Frost), a voluntary reset
 * within DD_RESET_MS of the player's own Damage Down (not flagged), a slide
 * into it on Thin Ice (the death strips Thin Ice), a killing blow FFLogs
 * dropped (not flagged), or walking into it (Major).
 */
function detectWallDeaths(players: PlayerInfo[], casts: EnemyEvent[], deaths: DeathEvent[], called: Set<DeathEvent>, start: number, end: number): PullError[] {
  const errors: PullError[] = [];
  for (const d of deaths) {
    if (d.killingAbilityGameId || called.has(d) || d.timestamp < start || d.timestamp > end) continue;
    const p = players.find((x) => x.name === d.player);
    if (!p) continue;
    const at = d.timestamp - DEATH_EVENT_LAG_MS;
    // Right after another death, the raid resets through the knockback or
    // the ice (B12 +36.3: six into the wall 5s after a death; J18 +58-60).
    // A lone knockback death is still a bad knockback (user, 2026-10-12,
    // T19 +40.1: the summoner knocked into the wall 7.8s after the GNB died).
    const kb = knockbackOf(casts, d, end);
    const kbAlone = kb && !deaths.some((x) => x !== d && !x.killingAbilityGameId && knockbackOf(casts, x, end) === kb);
    if (!kbAlone && deaths.some((x) => x !== d && x.player !== d.player && x.timestamp <= d.timestamp && d.timestamp - x.timestamp <= RESET_AFTER_DEATH_MS)) continue;
    if (!kb && ddReset(players, d)) continue;
    const ice = !kb && slidOnIce(players, d);
    if (!kb && !ice && p.damageTaken.some((e) => (e.amount ?? 0) > 0 && e.timestamp <= d.timestamp && d.timestamp - e.timestamp <= SILENT_HIT_MS)) continue;
    errors.push(playerError(p, {
      ruleId: UOF_WALL_RULE_ID, severity: "Major", name: kb ? "Knocked Into the Wall" : ice ? "Slid Into the Wall" : "Walked Into the Wall",
      description: kb
        ? `Knocked into the deathwall by ${kb.abilityName} (${sec(d.timestamp - kb.timestamp)}s before the death). Start the knockback where it carries you into the safe spot, not out of the arena.`
        : ice
          ? "Slid into the deathwall on Thin Ice. Every step slides a long way after the gaze; take short steps and start the twin-cleave dodge early."
          : "Died with no killing blow mid-pull: walked into the deathwall at the arena's edge.",
      timestamp: kb ? kb.timestamp : at, abilityId: kb?.abilityId ?? (ice ? THIN_ICE : 0), abilityName: kb ? kb.abilityName : ice ? "Thin Ice" : "Deathwall",
    }));
  }
  return errors;
}

// ── entry point ─────────────────────────────────────────────────────────────

/**
 * Futures Rewritten Phase 2 (Usurper of Frost and the crystal intermission)
 * errors. Self-gates on Quadruple Slap / Diamond Dust, which no other fight
 * uses, runs from the first non-P1 cast and stops at the first Phase 3 cast.
 * `headMarkers` names the Frigid Stone players; without them the Diamond
 * Dust cone/stone rules are skipped.
 */
export function detectUsurperOfFrostErrors(
  players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], headMarkers: HeadMarker[] = [], occurrences?: ReportedOccurrence[],
): PullError[] {
  if (!enemyCasts.some((c) => SIGNATURE.includes(c.abilityId))) return [];
  const { start, end: p3 } = phase2Window(enemyCasts);
  if (start === Infinity) return [];
  const deaths = deathEvents.filter((d) => d.timestamp <= p3);
  const life = buildLife(players, deaths);
  const lastEvent = Math.max(0, ...players.flatMap((p) => [...p.damageTaken, ...p.casts].map((e) => e.timestamp)), ...deathEvents.map((d) => d.timestamp));
  const end = Math.min(p3, lastEvent);
  const called = calledWipeDeaths(deaths.filter((d) => d.timestamp >= start), enemyCasts, life, players, p3 === Infinity ? lastEvent : Infinity, end);
  const from = start - 1000;

  const bossSpot = detectBossSpot(players, life, enemyCasts, end);
  const volley = (e: PullError) => (e.ruleId === UOF_AVOIDABLE_RULE_ID || e.ruleId === UOF_OVERLAP_RULE_ID) &&
    bossSpot.windows.some(([a, b]) => e.timestamp >= a && e.timestamp <= b);
  const errors = [
    ...detectAvoidable(players, life, from, end).filter((e) => !volley(e)),
    ...detectGaze(players, life, from, end),
    ...detectDiamondDust(players, life, enemyCasts, headMarkers, end, occurrences),
    ...detectOverlaps(players, life, headMarkers, from, end).filter((e) => !volley(e)),
    ...bossSpot.errors,
    ...detectStacks(players, life, from, end),
    ...detectPuddles(players, life, deaths, from, end),
    ...detectSlap(players, life, deaths, from, end, occurrences),
    ...detectRefulgentFate(players, life, deaths, from, end),
    ...detectCenterTower(players, life, enemyCasts, from, end),
    ...detectFifthStack(players, life, from, end),
    ...detectDeadGoingIn(players, life, enemyCasts, from, end),
    ...detectWallDeaths(players, enemyCasts, deaths, called, start, end),
  ];
  errors.push(...unexplainedMarks(players, deaths, errors, from, end, UOF_MARK_RULE_ID));

  // Timer checks: Absolute Zero with Shiva at 20%+, the Ice Veil surviving
  // Endless Ice Age.
  const az = hitsOf(players, life, AZ_ENRAGE, end)[0];
  if (az) {
    const cast = castsOf(enemyCasts, ABSOLUTE_ZERO_CAST, end).pop();
    const left = cast?.hitPoints !== undefined && cast.maxHitPoints ? ` Shiva had ${(100 * cast.hitPoints / cast.maxHitPoints).toFixed(1)}% HP left.` : "";
    errors.push(raidMarker(UOF_ENRAGE_RULE_ID, "Absolute Zero (Enrage)",
      `Absolute Zero went off with Shiva at 20% or more and killed the raid. The DPS check wasn't met.${left}`,
      az.e.timestamp, AZ_ENRAGE, "Absolute Zero"));
  }
  const iceAge = hitsOf(players, life, ENDLESS_ICE_AGE, end)[0];
  if (iceAge) {
    errors.push(raidMarker(UOF_ICE_AGE_RULE_ID, "Endless Ice Age (Enrage)",
      "Endless Ice Age finished: the Ice Veil wasn't destroyed in time. Kill the four light crystals so the Veil loses its invincibility, then burn it before the cast ends.",
      iceAge.e.timestamp, ENDLESS_ICE_AGE, "Endless Ice Age"));
  }

  // Generic cutoffs, only the earliest and only before any mechanic Raid.
  const generic: PullError[] = [];
  const calledList = deaths.filter((d) => called.has(d)).sort((a, b) => a.timestamp - b.timestamp);
  if (calledList.length >= CALLED_WIPE_COUNT) {
    generic.push(raidMarker(UOF_CALLED_WIPE_RULE_ID, "Wipe Called",
      `${calledList.length} players died with no killing blow (${joinNames(uniq(calledList.map((d) => d.player)))}): the wipe was called and the raid reset into the deathwall.`,
      calledList[0].timestamp - DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  if (p3 === Infinity) {
    const outAt = (t: number) => players.filter((p) => !life.alive(p, t));
    const collapseT = life.outIntervals.map((w) => w.start).filter((t) => t >= start).sort((a, b) => a - b)
      .find((t) => outAt(t).length >= COLLAPSE_DEAD_COUNT && lastEvent - t <= COLLAPSE_END_MS);
    if (collapseT !== undefined) {
      const who = outAt(collapseT).map((p) => p.name);
      generic.push(raidMarker(UOF_COLLAPSE_RULE_ID, "Party Collapse",
        `${who.length} players were dead at once (${joinNames(who)}). Treated as the cutoff point.`,
        collapseT + DEATH_EVENT_LAG_MS, 0, "Deaths"));
    }
  }
  const firstRaid = Math.min(...errors.filter((e) => e.severity === "Raid").map((e) => e.timestamp));
  const marker = generic.sort((a, b) => a.timestamp - b.timestamp)[0];
  if (marker && marker.timestamp < firstRaid) errors.push(marker);
  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
