// lib/mechanics/ffxiv/dancingmad/phase1.ts
//
// Encounter-specific error detection for Phase 1 of FFXIV's Dancing Mad
// (Kefka's Return) ultimate — everything up through the phase transition
// at roughly 3:25 (205s) into the fight.
//
// ── REVOLTING RUIN III THREAT LOSS (confirmed 2026-07-29, Q3GzJNZg64k1hLRm, ─
// ── pull 7) ─────────────────────────────────────────────────────────────
//
// The opening tankbuster pair (~0:11-0:19, 50179 then 50401, both sharing
// the in-game name "Revolting Ruin III"): hit 1 always lands on whoever
// currently holds highest enmity (the MT, in every clean pull sampled);
// hit 2 lands on whoever holds SECOND-highest enmity at that later moment.
// This raid's strategy has the OT provoke right after hit 1 specifically
// so their enmity lead holds through hit 2's resolution, bumping the MT
// back down to 2nd and making the MT eat BOTH hits (confirmed: hit 1 and
// hit 2 land on the same tank in 19 of 20 sampled pulls) — the MT only
// needs to mitigate once, and the OT's own cooldowns stay banked for the
// next tankbuster pair later in the fight. This is a mechanic aimed
// specifically at the OT: if their enmity lead doesn't hold (commonly
// because their tank stance — Iron Will/Defiance/Grit/Royal Guard for
// Paladin/Warrior/Dark Knight/Gunbreaker — was never turned on, so their
// own damage can't out-generate the MT's and enmity slides back before
// hit 2 fires), hit 2 lands on whoever it actually lands on instead — the
// OT themselves (confirmed pull 7: Sayacissa provoked but had no stance
// up, Salty Dango's ongoing damage "ripped" 1st back before hit 2, so
// Sayacissa dropped to 2nd and took it — and died to it, since an
// un-stanced tank can't survive a hit sized for one). Detection doesn't
// need to check stance directly (a pure outcome check is sufficient and
// more robust): if hit 1 resolves to a single clear tank (the MT) and
// hit 2 does NOT also land on that same tank, the OTHER tank (the OT) is
// flagged — the mechanic is built entirely around the OT's own threat
// upkeep, so any deviation from "MT tanks both" is on them, regardless of
// who the hit actually lands on. Self-gates on exactly 2 tanks and a
// single unambiguous hit-1 target; pulls where hit 1 itself already hit
// multiple people (already-scrambled from an earlier problem) are left
// alone rather than guessed at.
//
// ── BLIZZARD III BLOWOUT SILENT KILL (confirmed 2026-07, VtdBqhLQkWJXMvDg) ──
//
// Blizzard III Blowout (ability IDs vary — 47765/47768/47771/47774, all
// sharing the in-game name "Blizzard III Blowout") normally punishes a
// missed mechanic by applying Damage Down (1002911), already caught by the
// generic `ffxiv-damage-down` rule in error-rules.ts. Confirmed across
// every OTHER hit by this ability in this report: every survivor picked up
// Damage Down at the same instant as the hit. But when the hit is also the
// killing blow, the debuff application can lose the race with death and
// never actually land — the generic rule then has nothing to fire on, even
// though the mechanic was clearly missed. This rule covers that gap the
// same way exdeath.ts's Shockwave silent-kill check does: a death credited
// to Blizzard III Blowout with no preceding Damage Down application is
// flagged directly.
//
// ── JUMPED OFF THE ARENA (confirmed 2026-07, same report) ──────────────────
//
// When Phase 1 goes badly enough that the raid calls it, players commonly
// jump off the arena's edge to force an instant wipe/reset rather than
// waiting out the boss's remaining kit. FFLogs logs this as a "death" event
// with sourceID -1 and no killingAbilityGameID — fflTransformDeath already
// resolves that combination to DeathEvent.cause "Environmental" (no other
// death shape reaches this code path here; every other confirmed cause in
// this report's Phase 1 carries a real killingAbilityGameId). Once one
// player jumps, the rest of the raid typically follows suit within a few
// seconds — those are fallout of the same decision, not independent
// mistakes, so only the FIRST such death in Phase 1 gets a Raid-severity
// error naming that player; every later one in the same pull is suppressed.
//
// **Exception (confirmed 2026-07-22, report G7kTFVxjcAC6p1MN, pull 1):** a
// player who already has a Damage Down debuff (1002911) at the moment they
// jump is deliberately clearing that debuff, not signaling a raid reset —
// jumping is a valid, intentional fix for a mistake they already made and
// are now correcting. That jump is excluded from consideration entirely
// (not flagged, and doesn't count as "the first jump" for suppression
// purposes) — the rule only looks for the first jump among players who did
// NOT have Damage Down at the time.
//
// ── WAVE CANNON OUT OF POSITION / MITIGATION ISSUE ─────────────────────────
//
// Lives in wave-cannon.ts, NOT here — like Graven Image's spread, which job
// stands where for Wave Cannon turned out to be a raid strategy choice
// (confirmed cross-report), not a hardcoded game constant, so it has to be
// LEARNED from the report at hand rather than baked into a constant table.
// See that module's header for the mechanic, the learning method, and the
// separate raid-wide "Mitigation Issue" call for a death to a single
// unavoidable beam.
//
// ── WAVE CANNON TOWER OVERLAP (confirmed 2026-07-22, same report, pull 12) ─
//
// Each of the 4 Wave Cannon carriers drops a tower (47786) at their own
// feet the instant they're hit — 4 concurrent tower NPCs (sourceInstance
// 1-4), resolving ~3s later onto whichever of the OTHER 4 players is
// standing at that spot to soak it. Clean: 4 towers, 4 distinct soakers,
// one hit each. Confirmed failure (pull 12): the Pictomancer (Ayumi Emi)
// stood in the crossing point between two towers' soak spots and was hit
// by BOTH (sourceInstance 3 and 4, 43ms apart) — one tower's worth of
// damage would have been fine, but taking two killed her. Detection is
// gated purely on that outcome (2+ distinct tower instances hitting one
// target) — the same "gate on outcome" approach as Wave Cannon itself
// above, just without a position table (there's no single "wrong spot" to
// measure against; standing between two towers is the mistake).
//
// Self-gates on the mechanic having actually resolved cleanly: exactly 4
// distinct players hit by Wave Cannon itself, none of whom died before
// their own tower could resolve. Both other overlap-shaped pulls in this
// report (4, 13) turned out to be fallout of an EARLIER, already-flagged
// problem rather than a fresh tower mistake — pull 4's Wave Cannon
// mis-position (see above) killed 2 of the 4 carriers outright, and pull 13
// had already lost players to an earlier mechanic (Graven Image) before
// Wave Cannon even fired; both leave too few live carriers to cover 4
// towers, scrambling who gets hit by what. Excluding both keeps this rule
// to the one genuinely fresh positioning mistake it was built for.
//
// ── WAVE CANNON TOWER MISSED / UNMITIGATED EXPLOSION WIPE (confirmed ───────
// ── 2026-07-29, same report, pull 11) ───────────────────────────────────────
//
// The flip side of WAVE_CANNON_TOWER_OVERLAP above: a tower that nobody
// stands in at all, instead of one two people stand in. Verified directly
// from the raw log (not inferred): the boss's own tower cast (47786,
// "Explosion") resolves with `targetID: -1` when nobody was in range —
// FFLogs simply can't resolve a target — and roughly 700ms later the boss
// casts Unmitigated Explosion (47787) once per unresolved tower instance
// (cross-checked across every pull in this report: the Unmitigated
// Explosion cast count matches `4 - <distinct tower instances that hit
// someone>` exactly, every single time). That cast is what actually
// applies Damage Down (1002911) raid-wide a moment later — already caught
// by the generic `ffxiv-damage-down` rule, same relationship
// BLIZZARD_III_SILENT_KILL has with its own ability.
//
// Confirmed failure (pull 11): Azura Salus's own Wave Cannon
// mis-position (WAVE_CANNON_POSITION_RULE_ID, already flagged separately)
// overlapped her into Sayacissa's beam, leaving only 3 players never hit
// by Wave Cannon instead of the usual 4 — Chauzey Solstice and Kade
// Kansado each soaked one of the 4 towers, but Archidel Del'archi, the
// third and last non-carrier, took zero tower damage and left BOTH
// remaining towers (instances 3 and 4) unresolved. One of those two was
// always going to go unsoaked no matter what (3 people can't cover 4
// spots) — that part is fallout from Azura's own error, not counted
// twice. But Archidel could still have covered ONE of the two open towers
// and didn't cover either, which is what actually causes the wipe here —
// per the user's own framing, "since Archidel was not hit by a Wave
// Cannon, their job is to soak a tower," full stop, independent of how
// many non-carriers happen to be available that pull.
//
// Detection doesn't try to reason about which specific tower was "theirs"
// (no learned per-job assignment exists for this — see wave-cannon.ts's
// own header on why per-job Wave Cannon spots are learned, not
// hardcoded; carrier/non-carrier job composition isn't even consistent
// pull to pull in this report). It just flags every living non-carrier
// who took zero tower damage, gated on at least one tower actually going
// unresolved this pull (a non-carrier who's simply not needed — someone
// else soaked their tower for them, or covered two at once per the
// overlap rule above — must never be flagged; see the "unsoakedCount <=
// 0 -> []" gate). A non-carrier who died before the tower could resolve
// is excluded from consideration entirely — that's cascade fallout from
// an earlier death, not a fresh personal mistake (same reasoning as
// WAVE_CANNON_TOWER_OVERLAP's own `carrierDiedBeforeTowerResolved` gate,
// applied here per-player instead of pull-wide since a non-carrier dying
// doesn't invalidate every OTHER non-carrier's own soak).
//
// The Unmitigated Explosion cast itself also marks the pull as
// effectively over, same shape as MYSTERY_MAGIC_DEATH_WIPE/CONFETTI_LOST
// above — a single Raid error fires right at the cast (BEFORE the Damage
// Down debuffs it applies ~700ms later), so the generic Damage Down
// Major errors that follow get dropped by lib/report-data.ts's cutoff
// instead of counting as separate mistakes — per the user, the pull is
// effectively over the instant this cast fires.
//
// ── WAVE CANNON SUPPORT TOWER PRIORITY (confirmed 2026-07-30, same report, ─
// ── pull 23) ────────────────────────────────────────────────────────────
//
// A gap in WAVE_CANNON_TOWER_MISSED above: it only flags a non-carrier who
// took ZERO tower damage. Confirmed failure (pull 23): Kade Kansado, Ayumi
// Emi, Sayacissa Morsaelth, and Salty Dango were the 4 carriers (2 DPS +
// 2 support — Sayacissa and Dango). On the DPS side, Chauzey Solstice and
// Sonder Dreams each correctly soaked one DPS tower. On the support side,
// BOTH remaining supports — Azura Salus and Archidel Del'archi — soaked
// Sayacissa's tower, leaving Salty Dango's completely unsoaked ->
// Unmitigated Explosion wipe. Because both non-carrier supports took
// SOME tower damage, WAVE_CANNON_TOWER_MISSED's "zero damage" gate finds
// nobody to flag — a real miss with no attribution.
//
// Per the user, the support half of the roster has a fixed west-to-east
// standing order during this mechanic: H2 - H1 - OT - MT (SUPPORT_CONGA_
// ORDER below). Each Wave Cannon carrier's tower spawns at that carrier's
// own conga slot. Non-carrier supports fill the resulting open tower
// slots in the SAME west-to-east priority: the leftmost non-carrier takes
// the leftmost open tower, and so on. In pull 23, the carriers were OT
// (Sayacissa) and MT (Dango), so the open towers were the OT slot (left)
// and MT slot (right); the non-carriers were H1 (Azura) and H2 (Archidel).
// H2 always defers to the leftmost open tower (OT's, matching what
// actually happened — both Azura and Archidel went there), which means H1
// was the one required to move right and cover the MT tower instead of
// following H2. Per the user: "it was Azura that should be soaking the
// tower" — Azura was H1.
//
// This only fires when: (1) all 4 support roles resolve to a real,
// non-tentative player (detectFFRoles) — the fixed ordering means nothing
// otherwise; (2) the number of open support towers exactly matches the
// number of non-carrier supports (guaranteed by the 4-support roster
// unless a support died and dropped out entirely, in which case
// attribution isn't safe — see the death gate below, same reasoning as
// WAVE_CANNON_TOWER_MISSED's own carrierDiedBeforeTowerResolved-style
// check); and (3) at least one open support tower has ZERO soakers (the
// generic overlap rule already covers "one player soaked 2+ towers", and
// a tower soaked by exactly the priority-expected player needs no error).
// Only the specific non-carrier whose PRIORITY-EXPECTED tower ended up
// unsoaked is flagged — never every non-carrier, and never guessed when
// more than one open tower goes unsoaked with an ambiguous cause.
//
// ── WHICH TOWER IS WHOSE: POSITION, NOT sourceInstance (found while ────────
// ── building the above, same pull) ──────────────────────────────────────
//
// The first version of this rule matched a Wave Cannon Tower soak back to
// its carrier by sourceInstance, assuming the beam's instance number (1-4
// per volley) carries over to the tower NPC it spawns. Confirmed wrong
// directly from this report's raw data: the SAME volley's beam instances
// are always 1-4, but the resulting towers' own instances came back as {1,
// 10} in one pull and {2} in another — an entirely different, apparently
// pull-wide-incrementing numbering space, not reused per volley. Matching
// by instance silently attributed pull 23's miss to the wrong player
// (Archidel instead of Azura) even though the outcome-level detection
// (which tower went unsoaked) was already correct.
//
// Fixed by position instead: a tower spawns at its carrier's own feet the
// instant they're hit, so the carrier's OWN x/y at their Wave Cannon hit
// IS (approximately) the tower's location. Every tower soak is attributed
// to whichever of the 4 carriers' own hit-position it landed nearest to —
// matched against ALL 4 (not just the 2 support ones), so a genuinely
// DPS-side soak resolves to its real DPS carrier instead of being forced
// onto whichever support carrier happens to be nearer of only 2 choices;
// only kept for this rule when the true nearest carrier is a support one.
// Confirmed decisive in pull 23: Azura/Archidel's soak position sat ~1.5
// yalms from Sayacissa's own Wave Cannon position vs. ~6.1 yalms from Salty
// Dango's (and much further still from either DPS carrier), an unambiguous
// margin given towers are dropped several yalms apart. No positional
// tolerance/threshold needed — nearest-of-4 is decisive by a wide margin
// in practice.
//
// Runs over EITHER side of the roster via the same algorithm — see
// `detectWaveCannonRolePriorityErrors` below, parametrized by the fixed
// west-to-east conga order for that side. DPS side confirmed 2026-07-30
// (per the user, same session): M1 - M2 - R1 - R2, west to east
// (DPS_CONGA_ORDER). `detectWaveCannonSupportPriorityErrors`/
// `detectWaveCannonDpsPriorityErrors` are thin wrappers that just supply
// each side's role order and description label.
//
// ── TELE-TROUNCING ARROW PLACEMENT (confirmed 2026-07, pulls 6/15) ─────────
//
// At ~2:33, all 8 players get 2 stacks of "Tele-Portent" (8 distinct ability
// IDs — 4 cardinal directions x 2 duration tiers, ~7s and ~10s — see
// TELE_PORTENT_DIRECTION_BY_ABILITY_ID). When a stack's timer runs out, it
// drops a directional arrow on the ground at the player's CURRENT position
// (confirmed by cross-checking analyzer.wtfdig.info's own reverse-engineered
// formula — see below). All 16 arrows (8 players x 2) must form one
// continuous clockwise loop around the arena's outer ring so the raid can
// teleport through it without landing on/killing a confused teammate.
//
// The loop lives on a fixed 5-point grid per axis (yalms, relative to arena
// center 10000,10000): -12, -6, 0, +6, +12 — the outer ring of that 5x5
// grid (16 cells: 4 corners + 4 edges x 3 middle cells) is exactly the 16
// arrow slots. Each edge has its own fixed flow direction (clockwise): the
// N edge (y=-12) flows E, the E edge (x=+12) flows S, the S edge (y=+12)
// flows W, the W edge (x=-12) flows N. A player's assignment is fully
// determined by their own 2 debuff directions, independent of every other
// player — no cross-player resolution needed:
//   - SAME direction twice ("double-D"): their 2 arrows fill the 2 middle
//     cells of D's edge that AREN'T claimed by a neighboring corner's
//     approach arrow (see ARROW_DOUBLE_SLOTS_BY_DIRECTION).
//   - TWO DIFFERENT directions ("corner player"): the pair is always one of
//     4 valid clockwise-adjacent combinations (see ARROW_CORNER_TABLE), each
//     mapping to exactly one arena corner. One direction (the edge that
//     STARTS there, continuing the clockwise flow) occupies the corner cell
//     itself; the other (the edge that ENDS there) occupies that edge's
//     middle cell closest to the corner, pointing into it — e.g. an E+S
//     player's S arrow sits in the NE corner while their E arrow sits one
//     cell west of it along the N edge, pointing east into the corner.
//
// Position is sampled the same way analyzer.wtfdig.info's own bundle does
// (reverse-engineered by fetching and reading its minified JS, same
// technique as blackhole-strategy.ts's cardinal-direction work): the
// player's x/y from whichever damageTaken/healing event is CLOSEST in time
// to their Tele-Portent removedebuff. Verified byte-for-byte (to a decimal
// place) against the analyzer's own displayed table for pull 6.
//
// Confirmed failure (pull 6): the Dark Knight's pair was (E, S) — the NE
// corner — but both arrows landed on the arena's WEST side instead (14-21
// yalms from their expected slots), an entirely different corner, not just
// an adjacent-slot slip. A second, much closer-in failure mode is also
// confirmed (report xXV3mdnZvFJ8czBP pull 17): a Monk's arrow landed on the
// right corner/edge but short of the ring itself (~8.3 yalms off, an inner
// grid point instead of the outer one) — still enough to break the
// clockwise loop and wipe the raid. Every genuinely clean arrow sampled
// across every report deviates under 6.6 yalms from its predicted slot (one
// consistently "sloppy" Paladin included) — see
// ARROW_OUT_OF_POSITION_THRESHOLD_YALMS for where the line is drawn.
//
// ── MYSTERY MAGIC DEATH -> UNRESOLVABLE WIPE (confirmed 2026-07-28, ─────────
// ── report Q3GzJNZg64k1hLRm, pulls 1/2) ─────────────────────────────────────
//
// Mystery Magic (begincast/cast 47764) fires right after each Graven Image
// and resolves ~5s later with a raid-wide AoE tick in one of two elemental
// flavors — Flagrant Fire III (47778/47779) or Thrumming Thunder III
// (47775/47776/47777). A separate concurrent cast, Blizzard III Blowout
// (BLIZZARD_III_BLOWOUT_ABILITY_IDS above), is also part of the same
// mechanic package. **A death to any of these makes Wave Cannon
// unresolvable** — it already self-gates on exactly 4 live carriers (see
// WAVE_CANNON_TOWER_OVERLAP module comment), so no change was needed there.
//
// What WAS missing: nothing marked the pull as over at the point of death,
// so later incidental errors (e.g. generic Damage Down procs from a raid
// already spiraling toward a call) kept counting as real mistakes. A
// Raid-severity error now fires once, timestamped just after the death,
// functioning purely as the lib/report-data.ts cutoff marker — see that
// file's "once a raid-wide mistake has happened... Major errors after that
// point are dropped" logic, the same mechanism JUMPED_OFF_ARENA relies on
// above.
//
// Note: the Flagrant Fire III spread's own per-player position/overlap
// attribution (who stood in the wrong spot and got a neighbor killed too —
// pull 1's Salty Dango/Sonder Dreams case) is NOT duplicated here — that's
// graven-image.ts's `ffxiv-phase1-graven-image-spread-misplaced` rule,
// which already covers this exact resolution tick with a per-job LEARNED
// position table (more precise than a hardcoded west/east half) and its own
// overlap-plus-death gating. An earlier version of this rule set
// re-implemented that as a coarser role-based half-check and produced a
// duplicate error for the same mistake — removed 2026-07-28.
//
// ── CONFETTI LOST -> UNRESOLVABLE WIPE (confirmed 2026-07-30, same report, ──
// ── pull 9) ─────────────────────────────────────────────────────────────
//
// "Confetti" is this raid's own nickname for the Double-Trouble Trap debuff
// (buff ID 1005078, applied ~45s in, one player per role — confirmed pull
// 9: Kade Kansado and Salty Dango) that follows Wave Cannon. Same
// unresolvable-wipe shape as MYSTERY_MAGIC_DEATH_WIPE above: if a player
// carrying it dies, the mechanic can't resolve and the pull is over from
// there, even though (confirmed pull 9) the raid may visibly struggle on
// for another 30-40s before the actual wipe — a Raid-severity error fires
// once, immediately, purely as the lib/report-data.ts cutoff marker, same
// reasoning as every other rule in this file that does this.
//
// Gated the same way BLIZZARD_III_SILENT_KILL/JUMPED_OFF_ARENA check debuff
// history — "was it ever applied before this death" (ignoring an earlier
// removedebuff) rather than "is it active at the literal instant of death":
// confirmed pull 9's Salty Dango had her Double-Trouble Trap removed 2s
// before the (unrelated Wave Cannon Tower) hit that actually killed her,
// yet the user's own call was still "died carrying Confetti" — so the
// check accepts a short gap between removal and death rather than
// requiring the debuff to still be literally active at the death instant.
//
// ── CONFETTI KNOCKBACK POSITIONING (confirmed 2026-07-29, same report, ────
// ── pull 18) ─────────────────────────────────────────────────────────────
//
// Once Wave Cannon's towers resolve, Confetti (Double-Trouble Trap,
// 1005078) is applied to exactly 2 players — one DPS, one Support (see
// CONFETTI_LOST above) — for ~5s, then detonates: a knockback centered on
// EACH holder that shoves everyone standing between them and the boss all
// the way across the arena to the opposite side. The raid's strategy:
// DPS stack near the boss's own hitbox on the EAST side, Supports stack on
// the WEST side, and each Confetti holder stands further out (behind
// their own group, away from the boss) than the stack — so their
// detonation shoves their whole group across to the other (now-safe) side
// for whatever comes next.
//
// **Victim-side positioning (confirmed pull 18): Ayumi Emi (too far east,
// well past the hitbox — should have been hugging it like the rest of her
// group) and Azura Salus (too close, essentially under the boss).**
//
// **Corrected 2026-07-29 (same session): the FIRST version of this check
// gated on a player briefly picking up their OWN copy of the Double-
// Trouble Trap debuff during the detonation, distinct from the original 2
// holders' own application — this looked reliable (every second-wave
// pickup in this report was 0-2 people, never all 6) but was WRONG. Per
// the user directly: the Confetti holder's debuff transfers to a RANDOM
// member of whoever their blast actually hits, not necessarily the most
// mispositioned one. Confirmed: Sonder Dreams, Kade Kansado, and Ayumi
// Emi were ALL hit by the same knockback instance, yet only Ayumi
// happened to inherit the debuff — Sonder is independently confirmed
// correctly positioned despite being hit by the exact same blast. Who
// inherits the debuff is therefore uninformative; only geometry (distance
// from the hitbox ring — same interpolated-position technique as the
// holder check below) reliably separates a real mistake from incidental
// splash exposure. See CONFETTI_STACK_OVERSHOOT_TOLERANCE_CENTIYALMS /
// CONFETTI_STACK_UNDERSHOOT_TOLERANCE_CENTIYALMS for the confirmed
// clean/failure distances this was calibrated against (Sonder ~509 on
// the ring, Archidel Del'archi ~648 / Sayacissa Morsaelth ~652 as clean
// overshoot, Kade Kansado ~552 as the user's own deliberately-unenforced
// "could go either way" case, Ayumi ~1012 and Azura ~372 as the two
// confirmed failures).**
//
// **Holder-side positioning (confirmed pull 18): Salty Dango (the Support
// holder) stood north of the boss instead of west — visually confirmed
// against both FFLogs' and Tomestone's replay viewers (screenshots),
// since no single log sample close enough to the detonation was available
// to confirm it from raw data alone (see below).** This has no analogous
// debuff-reapplication signal (the holder IS the explosion, not a victim
// of it), so it's gated on outcome differently: interpolated position (see
// below) compared against the expected due-west/due-east bearing for the
// holder's role.
//
// **Open item — 3 independent detonations per fight, per the user
// directly: Wave Cannon's Confetti detonates a total of THREE times in
// this fight, and the debuff transfers to a different pair each time —
// each of the 3 is its OWN independent mechanic with its own stacking
// geometry, not 3 repeats of the same one. Confirmed so far (report
// VtdBqhLQkWJXMvDg, every pull long enough to reach it): the same
// Double-Trouble Trap buff reapplies to a wholly new pair ~69s after the
// first resolution — clustering (CONFETTI_RESOLUTION_GAP_MS) correctly
// keeps this from being mistaken for the first resolution's own fallout
// (an earlier version of this code had exactly that bug), but every
// holder in every one of these SECOND resolutions reads ~85-100° off the
// due-west/due-east axis — far too consistent across an entire report to
// be everyone failing identically, and the tight clustering right around
// 90° strongly suggests the TRUE axis for this second resolution is
// north/south, not east/west. Both `detectConfettiHolderMisplacedErrors`
// and `detectConfettiKnockbackVictimErrors` deliberately only check the
// FIRST resolution for now — the 2nd and 3rd each need their own
// confirmed geometry from the user before detection can be built for
// them, same working method as everything else in this file.**
//
// ── WHY INTERPOLATION, NOT JUST THE NEAREST SAMPLE ─────────────────────────
//
// Same snapshot-timing problem as graven-image.ts's own "SNAPSHOT
// POSITION" section: the knockback's hit-time position already reflects
// wherever a victim ended up AFTER being flung, and the nearest single
// PRE-detonation sample can be seconds stale (a healer's own self-heal/
// self-cast ticks land irregularly; a non-healer's are rarer still).
// Confirmed directly against this pull's log: Salty Dango's own nearest
// pre-detonation sample (a self HoT tick, ~1.6s before) reads as roughly
// due west — looks fine — but he ACTUALLY drifted north-then-back in the
// time since, which nothing in a single-sample lookup can see. The fix:
// `interpolatePlayerPosition` (player-position.ts) brackets the target
// moment between the nearest REAL sample before AND after it and
// linearly interpolates — this recovered his true north drift (bracketed
// between a self-heal 345ms before and one 366ms after) once fed by
// `player.healingReceived` (see below), matching what the FFLogs/
// Tomestone replay viewers show. A straight line between two real
// samples ~700ms apart is a reasonable model of actual movement (players
// run at a roughly constant speed between GCDs, they don't teleport) —
// nowhere near as reliable as a genuinely dense position feed, but a real
// improvement over "nearest single sample, however stale."
//
// The snapshot moment itself is anchored the same way as other
// snapshot-sensitive mechanics: roughly half a second before the
// knockback's own damage lands on its victims (CONFETTI_SNAPSHOT_LEAD_MS).
//
// ── WHY `healingReceived`, NOT JUST `healing`/`casts` ───────────────────────
//
// Investigated (2026-07-29) whether FFLogs' API exposes denser
// player-position data than what this app already fetches (the way a
// replay viewer's smooth playback suggests) — probed `Casts`/`Debuffs`/
// `Buffs` under `hostilityType: Enemies` directly against the live API;
// none carry player-source position beyond what `enemyDamageTaken`
// already provides (itself confirmed sparse for this fight — 11 of 652
// events). The self-heal-only position trick every other module here uses
// (`healing: "self"`) starves non-healers, who rarely self-heal, of
// almost every sample. The fix that actually closed the gap: a NEW
// PlayerInfo field, `healingReceived` — heals landing ON this player from
// ANY source, unconditionally trustworthy as their own position (FFLogs'
// targetResources always belongs to the target, and the target here
// always IS this player, so — unlike `healing` — no self-cast caveat is
// needed at all). A raid healer lands a heal on nearly every player every
// ~2.5s GCD, making this the densest position source available short of
// damageTaken. See types/PlayerInfo.ts's field comment and
// player-position.ts's `healingReceived: "any"` option.
//
// Graven Image's spread mechanic (~0:38, cast "Graven Image", 48370) lives
// in its own file, graven-image.ts, NOT here — unlike everything else in
// this module, its "ideal position" can't be hardcoded: which specific job
// occupies which physical spot is a raid's own strategy choice (confirmed
// by cross-report testing — a different report's White Mage/Paladin stood
// somewhere completely different from this report's, consistently, not by
// mistake). It's cross-pull/learned-per-report instead, same reason
// blackhole-strategy.ts is split out from blackhole.ts.

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { PullError, EnemyEvent } from "@/types/PullError";
import type { DeathEvent } from "@/types/DeathEvent";
import { distanceBetween, distanceFromCenter, ARENA_CENTER } from "@/lib/mechanics/geometry";
import { interpolatePlayerPosition } from "@/lib/mechanics/player-position";
import { detectFFRoles, type FFRoleSlot } from "@/lib/mechanics/ffxiv/roles";

export const BLIZZARD_III_SILENT_KILL_RULE_ID = "ffxiv-phase1-blizzard3-silent-kill";
export const JUMPED_OFF_ARENA_RULE_ID          = "ffxiv-phase1-jumped-off-arena";
export const WAVE_CANNON_TOWER_OVERLAP_RULE_ID   = "ffxiv-phase1-wave-cannon-tower-overlap";
export const WAVE_CANNON_TOWER_MISSED_RULE_ID    = "ffxiv-phase1-wave-cannon-tower-missed";
export const WAVE_CANNON_TOWER_PRIORITY_RULE_ID  = "ffxiv-phase1-wave-cannon-tower-priority-missed";
export const UNMITIGATED_EXPLOSION_WIPE_RULE_ID  = "ffxiv-phase1-unmitigated-explosion-wipe";
export const TELE_TROUNCING_ARROW_RULE_ID = "ffxiv-phase1-tele-trouncing-arrow-misplaced";
export const MYSTERY_MAGIC_DEATH_WIPE_RULE_ID = "ffxiv-phase1-mystery-magic-death-wipe";
export const REVOLTING_RUIN_THREAT_LOSS_RULE_ID = "ffxiv-phase1-revolting-ruin-threat-loss";
export const CONFETTI_LOST_RULE_ID = "ffxiv-phase1-confetti-lost";
export const CONFETTI_KNOCKBACK_VICTIM_RULE_ID = "ffxiv-phase1-confetti-knockback-victim-misplaced";
export const CONFETTI_HOLDER_MISPLACED_RULE_ID = "ffxiv-phase1-confetti-holder-misplaced";

const BLIZZARD_III_BLOWOUT_ABILITY_IDS = new Set([47765, 47768, 47771, 47774]);
const DAMAGE_DOWN_ABILITY_ID = 1002911;

const REVOLTING_RUIN_FIRST_HIT_ABILITY_ID  = 50179;
const REVOLTING_RUIN_SECOND_HIT_ABILITY_ID = 50401;

// "Confetti" — this raid's own nickname for the Double-Trouble Trap debuff.
const DOUBLE_TROUBLE_TRAP_BUFF_ID = 1005078;

// Generous gap between the debuff being applied and a death that should
// still count as "died carrying Confetti" — see module header (confirmed
// pull 9: the debuff's own removedebuff fired 2s before the unrelated hit
// that actually killed the carrier).
const CONFETTI_DEATH_WINDOW_MS = 10_000;

// The knockback's own damage/debuff-reapplication ability — distinct from
// 47782 (the begincast that grants the debuff to its 2 holders) and the
// 1005078 buff ID itself. See module header.
const CONFETTI_EXPLOSION_ABILITY_ID = 47783;

// Two Double-Trouble Trap applications at (near-)identical timestamps are
// the SAME resolution's 2 original holders; a later, distinct-timestamp
// application is a victim caught by the detonation — see module header.
const CONFETTI_HOLDER_WAVE_CLUSTER_MS = 100;

// Kefka's own hitbox radius from arena center — ~500 centiyalms, derived
// from Sonder Dreams' confirmed-correct stack position in
// Q3GzJNZg64k1hLRm pull 18 (~505/509 via interpolatePlayerPosition
// depending on exact bracket, rounded to a clean 500 — see module
// header). Both the DPS and Support stacks hug this ring; each Confetti
// holder stands further out than it.
const CONFETTI_HITBOX_RADIUS_CENTIYALMS = 500;

// A holder's bearing from center should be close to due-west (Support) or
// due-east (DPS) — see module header. Comfortably between the confirmed
// clean case (Chauzey Solstice, ~8° off due-east) and the confirmed
// failure (Salty Dango, ~62° off due-west, actually north-dominant).
const CONFETTI_HOLDER_ANGLE_TOLERANCE_DEG = 40;

// Below this, a bearing from center is too noisy to trust at all (tiny
// position errors swing it wildly) — deliberately much smaller than the
// ~500 hitbox radius above: a mispositioned holder can easily end up
// standing CLOSER to center than the ring itself (confirmed: Salty
// Dango's own failure put him at ~455, under it), and that closeness is
// itself part of the mistake, not a reason to skip judging their bearing.
const CONFETTI_MIN_DIST_FOR_BEARING_CENTIYALMS = 150;

// How far the non-holder "stack" is allowed to sit from the hitbox ring
// before/behind it, in each direction — deliberately asymmetric. Two
// confirmed-clean overshoots (Archidel Del'archi ~648, Sayacissa
// Morsaelth ~652 — ~148-152 over the ring) and one deliberately-ambiguous
// small overshoot (Kade Kansado ~552, ~52 over — the user's own "could go
// either way," left unflagged either way by this threshold) all sit
// comfortably under CONFETTI_STACK_OVERSHOOT_TOLERANCE, while the
// confirmed failure (Ayumi Emi ~1012, ~512 over) clears it easily. No
// confirmed-clean UNDERSHOOT sample exists yet (there's no legitimate
// reason to stand inside the ring at all, unlike standing a bit further
// back), so CONFETTI_STACK_UNDERSHOOT_TOLERANCE is set much tighter —
// just above ordinary jitter — catching the one confirmed undershoot
// failure (Azura Salus ~372, ~128 under).
const CONFETTI_STACK_OVERSHOOT_TOLERANCE_CENTIYALMS  = 250;
const CONFETTI_STACK_UNDERSHOOT_TOLERANCE_CENTIYALMS = 100;

// How long before the knockback's own damage lands its interpolated
// "snapshot" position should be read — see module header's "WHY
// INTERPOLATION" section; matches the ~0.5s lead every other
// snapshot-sensitive mechanic in this codebase uses.
const CONFETTI_SNAPSHOT_LEAD_MS = 500;

// Generous bracket for interpolatePlayerPosition's own before/after
// sample search — wide enough to reach a non-healer's sparser samples
// (confirmed pull 18: Salty Dango's nearest usable pair sat ~700ms apart,
// comfortably inside this) without stretching across a genuinely stale gap.
const CONFETTI_POSITION_WINDOW_MS = 4000;

const SUPPORT_ROLES = new Set(["Tank", "Healer"]);

// Tank stance per job — the thing the OT needs active for their post-
// provoke enmity lead to hold through Revolting Ruin III's second hit (see
// module header). Not currently read by detection (a pure outcome check —
// did hit 2 land on the same tank as hit 1 — proved sufficient and more
// robust than checking stance directly), kept here per the user's own
// breakdown for future mitigation-tracking use. Iron Will/Defiance are
// UNCONFIRMED — no sampled report has a Paladin or Warrior tank to verify
// their buff IDs against; only Grit and Royal Guard are confirmed (via
// this report's own debuffs stream).
const TANK_STANCE_BUFF_ID_BY_CLASS_NAME: Readonly<Record<string, number>> = {
  "Dark Knight": 1000743, // Grit
  "Gunbreaker":  1001833, // Royal Guard
  // "Paladin":  <unconfirmed>, // Iron Will
  // "Warrior":  <unconfirmed>, // Defiance
};

// Everything a Mystery Magic death can be credited to — the two confirmed
// raid-wide resolution tick flavors (Flagrant Fire III, Thrumming Thunder
// III) plus Blizzard III Blowout (also part of the same mechanic package —
// see BLIZZARD_III_SILENT_KILL above). Used only to find the death that
// marks the pull as unresolvable, not for attribution (see module comment —
// attribution for the spread tick itself lives in graven-image.ts).
const MYSTERY_MAGIC_DEATH_ABILITY_IDS = new Set([
  47778, 47779,             // Flagrant Fire III
  47775, 47776, 47777,      // Thrumming Thunder III
  ...BLIZZARD_III_BLOWOUT_ABILITY_IDS,
]);

// A single Mystery Magic resolution's hits/deaths span well under 3s
// (observed: first hit to final death ~2.7s in pull 1); the next
// Graven Image/Mystery Magic instance in the same pull is ~10s+ later — wide
// margin on both sides.
const MYSTERY_MAGIC_VOLLEY_CLUSTER_MS = 3000;

// Phase 1 runs roughly 0-205s (the "~3:25" phase transition the user's own
// mitigation plan already anchors on — see mitigation-plans/ikuya.json's
// phaseTimeSeconds: 205 entry for Phase 2's start). Generous past that
// point costs nothing (a genuine jump this late would still be a fair
// catch), so this is a soft upper bound, not a tight one.
const PHASE_1_END_MS = 210_000;

const WAVE_CANNON_ABILITY_ID = 47784;

// Volley hits on different targets land within tens of ms of each other on
// real logs (observed: <50ms apart); generous without risking merging two
// genuinely separate Wave Cannon activations (which never recur this close
// together in Phase 1).
const WAVE_CANNON_VOLLEY_CLUSTER_MS = 250;

// The tower each of the 4 Wave Cannon carriers drops at their own feet the
// instant they're hit (begincast fires at the same timestamp as the Wave
// Cannon hit itself), resolving ~3s later onto whichever of the other 4
// players is standing there to soak it — see WAVE_CANNON_TOWER_OVERLAP
// module comment below.
const WAVE_CANNON_TOWER_ABILITY_ID = 47786;

// Cast once per unresolved (nobody-soaked) tower instance, ~700ms after the
// tower itself resolves with no target — see module header.
const UNMITIGATED_EXPLOSION_ABILITY_ID = 47787;

// Fixed west-to-east standing order for the 4 support roles during Wave
// Cannon — see the WAVE CANNON SUPPORT TOWER PRIORITY module comment above.
const SUPPORT_CONGA_ORDER: readonly FFRoleSlot[] = ["H2", "H1", "OT", "MT"];
// Same conga-priority mechanic, DPS side (confirmed 2026-07-30, per the
// user): M1 - M2 - R1 - R2, west to east.
const DPS_CONGA_ORDER: readonly FFRoleSlot[] = ["M1", "M2", "R1", "R2"];

// Position window for resolving the DPS side's M1-vs-M2 order near the
// Wave Cannon moment — same magnitude as CONFETTI_POSITION_WINDOW_MS
// (players are stacked and largely stationary in the seconds around a
// mechanic resolution, so a few-second window is generous without being
// stale).
const WAVE_CANNON_ROLE_POSITION_WINDOW_MS = 4000;

// Minimal shape detectWaveCannonRolePriorityErrors needs from a role
// resolution — deliberately NOT roles.ts's RoleAssignment (which requires
// a `source` tag support's straight detectFFRoles() output already has,
// but the DPS side's position-resolved M1/M2 doesn't cleanly fit any of
// roles.ts's existing source values).
type SideAssignment = { slot: FFRoleSlot; player: PlayerInfo | null; tentative: boolean };

type Cardinal = "N" | "E" | "S" | "W";
type Point = { x: number; y: number };

// abilityId -> which cardinal direction the resulting arrow points. Each
// direction has a short (~7s) and long (~10s) duration variant, which is
// why there are 8 IDs for 4 directions — see module header.
const TELE_PORTENT_DIRECTION_BY_ABILITY_ID: Readonly<Record<number, Cardinal>> = {
  1004876: "N", 1005079: "N",
  1004878: "E", 1005081: "E",
  1004877: "S", 1005080: "S",
  1004879: "W", 1005082: "W",
};

// The short-duration debuffs on all 8 players expire within ~100ms of each
// other, then the long-duration ones ~3s later — comfortably inside this
// window without risking merging the two waves together.
const TELE_PORTENT_WAVE_CLUSTER_MS = 1500;

const ARROW_GRID_FAR_YALMS = 12;
const ARROW_GRID_MID_YALMS = 6;

// sorted-pair key -> which of the 2 directions occupies the corner cell
// itself (the edge that STARTS its clockwise flow there) vs. the adjacent
// edge's middle cell closest to that corner (the edge that ENDS there),
// plus the corner cell's [signX, signY] — see module header for the
// underlying rule. Only these 4 combinations are valid; any other pairing
// (e.g. opposite directions N+S) never occurs in real data.
const ARROW_CORNER_TABLE: Readonly<Record<string, { cornerDir: Cardinal; approachDir: Cardinal; signX: number; signY: number }>> = {
  "E,N": { cornerDir: "E", approachDir: "N", signX: -1, signY: -1 }, // NW
  "E,S": { cornerDir: "S", approachDir: "E", signX: 1,  signY: -1 }, // NE
  "S,W": { cornerDir: "W", approachDir: "S", signX: 1,  signY: 1 },  // SE
  "N,W": { cornerDir: "N", approachDir: "W", signX: -1, signY: 1 },  // SW
};

function predictCornerSlots(d1: Cardinal, d2: Cardinal) {
  const key = [d1, d2].sort().join(",");
  const c = ARROW_CORNER_TABLE[key];
  if (!c) return null;
  const cornerPos: Point = { x: c.signX * ARROW_GRID_FAR_YALMS, y: c.signY * ARROW_GRID_FAR_YALMS };
  const approachPos: Point = c.approachDir === "N" || c.approachDir === "S"
    ? { x: c.signX * ARROW_GRID_FAR_YALMS, y: c.signY * ARROW_GRID_MID_YALMS }
    : { x: c.signX * ARROW_GRID_MID_YALMS, y: c.signY * ARROW_GRID_FAR_YALMS };
  return { cornerDir: c.cornerDir, cornerPos, approachDir: c.approachDir, approachPos };
}

// A "double-D" player's 2 arrows fill whichever 2 of D's edge's 3 middle
// cells aren't already claimed by a neighboring corner's approach arrow.
function predictDoubleSlots(dir: Cardinal): [Point, Point] {
  switch (dir) {
    case "N": return [{ x: -ARROW_GRID_FAR_YALMS, y: 0 }, { x: -ARROW_GRID_FAR_YALMS, y: ARROW_GRID_MID_YALMS }];
    case "E": return [{ x: -ARROW_GRID_MID_YALMS, y: -ARROW_GRID_FAR_YALMS }, { x: 0, y: -ARROW_GRID_FAR_YALMS }];
    case "S": return [{ x: ARROW_GRID_FAR_YALMS, y: -ARROW_GRID_MID_YALMS }, { x: ARROW_GRID_FAR_YALMS, y: 0 }];
    case "W": return [{ x: 0, y: ARROW_GRID_FAR_YALMS }, { x: ARROW_GRID_MID_YALMS, y: ARROW_GRID_FAR_YALMS }];
  }
}

// NOTE: this module works in RELATIVE YALMS (see toRelativeYalms below),
// not raw centi-yalms — distanceBetween is unit-agnostic, but its results
// here are already yalms, no /100 needed.
const pointDistance = distanceBetween;

// FFLogs position (centi-yalms, arena center 10000,10000) -> yalms relative
// to center, matching analyzer.wtfdig.info's own Ol()/ty() helpers.
function toRelativeYalms(xRaw: number, yRaw: number): Point {
  return { x: xRaw / 100 - 100, y: yRaw / 100 - 100 };
}

function nearestPlayerPosition(events: PlayerEvent[], timestamp: number): Point | null {
  let best: PlayerEvent | null = null;
  let bestDiff = Infinity;
  for (const e of events) {
    if (e.x === undefined || e.y === undefined) continue;
    const diff = Math.abs(e.timestamp - timestamp);
    if (diff < bestDiff) { bestDiff = diff; best = e; }
  }
  return best ? toRelativeYalms(best.x!, best.y!) : null;
}

// Clean max observed (a consistently "sloppy" Paladin's corner arrow) is
// ~6.6 yalms. Originally set to 10 on a wide margin below the confirmed
// failure minimum of ~13.9-18.5 — but that gap turned out to hide a real,
// closer-in failure: report xXV3mdnZvFJ8czBP pull 17's Monk dropped their
// S arrow at only ~8.3 yalms off (still on-angle-adjacent, just short of
// the correct grid cell — landed at an inner (6,-6) point instead of the
// NE corner's (12,-12)), which the old threshold missed entirely and which
// caused a real wipe (a raid member fell through the arena ~9s after the
// last arrow landed, the same "jumped off arena" signature Tele-Trouncing
// failures always produce). 7.5 splits the now 3-tier-confirmed data
// (6.6 clean / 8.3 failure / 13.9+ failure) with margin on both sides of
// the closer gap.
const ARROW_OUT_OF_POSITION_THRESHOLD_YALMS = 7.5;

// "Double-D" (same cardinal direction twice) arrows sit much more tightly
// on their slot than corner arrows across every report sampled — clean max
// observed is ~1.8 yalms (vs corner's ~5.9), so this case gets its OWN,
// much tighter threshold rather than sharing the corner one above.
// Confirmed 2026-07-22 (report G7kTFVxjcAC6p1MN, pull 1): a Paladin's
// double-North arrows, both pulled in too far toward the boss, deviated
// ~4.1 and ~2.4 yalms — comfortably above this line, comfortably below
// what the corner threshold would have required to catch the same mistake.
const ARROW_DOUBLE_OUT_OF_POSITION_THRESHOLD_YALMS = 2;

/**
 * Detects the OT failing to hold enmity through Revolting Ruin III's
 * second hit — see module header for the mechanic and why this is a pure
 * outcome check (hit 2 landed on someone other than hit 1's tank) rather
 * than a stance-buff check.
 */
function detectRevoltingRuinThreatLossErrors(players: PlayerInfo[]): PullError[] {
  const tanks = players.filter((p) => p.role === "Tank");
  if (tanks.length !== 2) return []; // needs the standard 2-tank comp to reason about MT/OT

  const hit1Targets = new Set<string>();
  let hit1Timestamp: number | undefined;
  const hit2Targets = new Set<string>();
  let hit2Timestamp: number | undefined;
  for (const player of players) {
    for (const e of player.damageTaken) {
      if (e.abilityId === REVOLTING_RUIN_FIRST_HIT_ABILITY_ID) {
        hit1Targets.add(player.name);
        hit1Timestamp = hit1Timestamp === undefined ? e.timestamp : Math.min(hit1Timestamp, e.timestamp);
      } else if (e.abilityId === REVOLTING_RUIN_SECOND_HIT_ABILITY_ID) {
        hit2Targets.add(player.name);
        hit2Timestamp = hit2Timestamp === undefined ? e.timestamp : Math.min(hit2Timestamp, e.timestamp);
      }
    }
  }
  // Ambiguous hit 1 (already scrambled by an earlier problem) — don't guess.
  if (hit1Targets.size !== 1 || hit2Timestamp === undefined) return [];

  const mtName = [...hit1Targets][0];
  if (hit2Targets.has(mtName)) return []; // clean — the MT tanked both hits

  const mt = tanks.find((t) => t.name === mtName);
  const ot = tanks.find((t) => t.name !== mtName);
  if (!mt || !ot) return []; // hit 1 didn't land on either tank at all — not this mechanic's usual shape

  return [
    {
      ruleId:      REVOLTING_RUIN_THREAT_LOSS_RULE_ID,
      severity:    "Major",
      name:        "Revolting Ruin III Threat Lost",
      description: `Failed to hold enmity after provoking Revolting Ruin III — the second hit landed on ${[...hit2Targets].join(" and ")} instead of ${mt.name} (${mt.className}) tanking both.`,
      timestamp:   hit2Timestamp,
      player:      ot.name,
      class:       ot.className,
      specId:      ot.specId,
      role:        ot.role,
      abilityId:   REVOLTING_RUIN_SECOND_HIT_ABILITY_ID,
      abilityName: "Revolting Ruin III",
    },
  ];
}

function detectBlizzardIIIBlowoutSilentKillErrors(players: PlayerInfo[], deathEvents: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];

  for (const death of deathEvents) {
    if (!BLIZZARD_III_BLOWOUT_ABILITY_IDS.has(death.killingAbilityGameId)) continue;

    const victim = players.find((p) => p.name === death.player);
    if (!victim) continue;

    const everHadDamageDown = victim.debuffs.some(
      (d) =>
        d.abilityId === DAMAGE_DOWN_ABILITY_ID &&
        d.debuffStatus === "applied" &&
        d.timestamp <= death.timestamp
    );
    if (everHadDamageDown) continue; // the generic ffxiv-damage-down rule already covers this

    errors.push({
      ruleId:      BLIZZARD_III_SILENT_KILL_RULE_ID,
      severity:    "Major",
      name:        "Blizzard III Blowout Killed Instantly",
      description: "Died to Blizzard III Blowout without ever receiving the Damage Down debuff it normally applies — the mechanic was missed badly enough to kill outright instead of just punishing with the debuff.",
      timestamp:   death.timestamp,
      player:      death.player,
      class:       death.class,
      specId:      death.specId,
      role:        death.role,
      abilityId:   death.killingAbilityGameId,
      abilityName: "Blizzard III Blowout",
    });
  }

  return errors;
}

function detectJumpedOffArenaError(players: PlayerInfo[], deathEvents: DeathEvent[]): PullError[] {
  const hadDamageDownAt = (playerName: string, timestamp: number) => {
    const player = players.find((p) => p.name === playerName);
    if (!player) return false;
    return player.debuffs.some(
      (d) =>
        d.abilityId === DAMAGE_DOWN_ABILITY_ID &&
        d.debuffStatus === "applied" &&
        d.timestamp <= timestamp
    );
  };

  const jump = deathEvents
    .filter((d) => d.timestamp <= PHASE_1_END_MS && d.cause === "Environmental")
    .filter((d) => !hadDamageDownAt(d.player, d.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp)[0];
  if (!jump) return [];

  return [
    {
      ruleId:      JUMPED_OFF_ARENA_RULE_ID,
      severity:    "Raid",
      name:        "Jumped Off The Arena",
      description: `${jump.player} jumped off the arena, signaling a raid wipe and reset.`,
      timestamp:   jump.timestamp,
      abilityId:   0,
      abilityName: "Jumped Off The Arena",
    },
  ];
}

/**
 * Detects a player caught standing in the overlap between two Wave Cannon
 * towers, soaking both instead of the one they were meant to. See the
 * module comment for the mechanic and its cascade-suppression gates.
 */
function detectWaveCannonTowerOverlapErrors(players: PlayerInfo[], deathEvents: DeathEvent[]): PullError[] {
  const waveCannonHitTimestamps: number[] = [];
  const waveCannonCarriers = new Set<string>();
  for (const player of players) {
    for (const e of player.damageTaken) {
      if (e.abilityId !== WAVE_CANNON_ABILITY_ID) continue;
      waveCannonCarriers.add(player.name);
      waveCannonHitTimestamps.push(e.timestamp);
    }
  }
  if (waveCannonHitTimestamps.length === 0) return [];

  // Fewer than 4 carriers means the mechanic didn't resolve as designed —
  // some players never reached it (an earlier wipe already underway) —
  // and the remaining towers can't be trusted to mean anything.
  if (waveCannonCarriers.size !== 4) return [];

  const waveCannonTime = Math.min(...waveCannonHitTimestamps);

  // A carrier who dies before their own tower resolves leaves it to
  // re-target/scramble the remaining soakers — same cascade-suppression
  // pattern as limitcut.ts's dead-before-the-dash check.
  const carrierDiedBeforeTowerResolved = deathEvents.some(
    (d) =>
      waveCannonCarriers.has(d.player) &&
      d.timestamp >= waveCannonTime &&
      d.timestamp <= waveCannonTime + WAVE_CANNON_VOLLEY_CLUSTER_MS + 5000
  );
  if (carrierDiedBeforeTowerResolved) return [];

  const errors: PullError[] = [];
  for (const player of players) {
    const towerHits = player.damageTaken.filter((e) => e.abilityId === WAVE_CANNON_TOWER_ABILITY_ID);
    const distinctInstances = new Set(towerHits.map((e) => e.sourceInstance).filter((i) => i !== undefined));
    if (distinctInstances.size < 2) continue;

    errors.push({
      ruleId:      WAVE_CANNON_TOWER_OVERLAP_RULE_ID,
      severity:    "Major",
      name:        "Soaked Multiple Wave Cannon Towers",
      description: `Stood in the overlap between ${distinctInstances.size} Wave Cannon towers and soaked all of them — should only ever take one.`,
      timestamp:   Math.min(...towerHits.map((e) => e.timestamp)),
      player:      player.name,
      class:       player.className,
      specId:      player.specId,
      role:        player.role,
      abilityId:   WAVE_CANNON_TOWER_ABILITY_ID,
      abilityName: "Wave Cannon Tower",
    });
  }
  return errors;
}

/**
 * Detects a living non-carrier (never hit by Wave Cannon) who took zero
 * Wave Cannon Tower damage in a pull where at least one tower actually went
 * unresolved. See module header — this is the mirror image of
 * detectWaveCannonTowerOverlapErrors above (missing a soak entirely,
 * instead of soaking two).
 */
function detectWaveCannonTowerMissedErrors(
  players:     PlayerInfo[],
  deathEvents: DeathEvent[],
  enemyCasts:  EnemyEvent[]
): PullError[] {
  const waveCannonHits = new Map<number, { player: PlayerInfo; timestamp: number }[]>();
  const waveCannonCarriers = new Set<string>();
  for (const player of players) {
    for (const e of player.damageTaken) {
      if (e.abilityId !== WAVE_CANNON_ABILITY_ID || e.sourceInstance === undefined) continue;
      waveCannonCarriers.add(player.name);
      const list = waveCannonHits.get(e.sourceInstance) ?? [];
      list.push({ player, timestamp: e.timestamp });
      waveCannonHits.set(e.sourceInstance, list);
    }
  }
  if (waveCannonHits.size === 0) return [];

  const totalTowers = waveCannonHits.size;
  const waveCannonTime = Math.min(...[...waveCannonHits.values()].flat().map((h) => h.timestamp));

  const coveredInstances = new Set<number>();
  const soakedByPlayer = new Set<string>();
  for (const player of players) {
    for (const e of player.damageTaken) {
      if (e.abilityId !== WAVE_CANNON_TOWER_ABILITY_ID || e.sourceInstance === undefined) continue;
      coveredInstances.add(e.sourceInstance);
      soakedByPlayer.add(player.name);
    }
  }

  // Every tower resolved (soaked once, or soaked twice by an overlapper
  // already caught by the rule above) — nothing missed.
  if (coveredInstances.size >= totalTowers) return [];

  // A non-carrier who died before the towers could resolve can't have
  // soaked anything — that's fallout from an earlier death, not a fresh
  // mistake here (same reasoning as the overlap rule's own
  // carrierDiedBeforeTowerResolved gate, applied per-player).
  const diedBeforeResolve = (playerName: string) =>
    deathEvents.some(
      (d) =>
        d.player === playerName &&
        d.timestamp >= waveCannonTime &&
        d.timestamp <= waveCannonTime + WAVE_CANNON_VOLLEY_CLUSTER_MS + 5000
    );

  const missedSoakers = players.filter(
    (p) => !waveCannonCarriers.has(p.name) && !soakedByPlayer.has(p.name) && !diedBeforeResolve(p.name)
  );
  if (missedSoakers.length === 0) return [];

  // Anchor the description/timestamp on the boss's own tower-resolution
  // cast (47786) closest to the Wave Cannon volley, falling back to the
  // volley itself if that stream wasn't fetched.
  const towerResolveTimestamp = enemyCasts
    .filter(
      (e) =>
        e.abilityId === WAVE_CANNON_TOWER_ABILITY_ID &&
        e.timestamp >= waveCannonTime &&
        e.timestamp <= waveCannonTime + WAVE_CANNON_VOLLEY_CLUSTER_MS + 5000
    )
    .reduce((min, e) => Math.min(min, e.timestamp), Infinity);
  const timestamp = Number.isFinite(towerResolveTimestamp) ? towerResolveTimestamp : waveCannonTime + 1;

  return missedSoakers.map((player) => ({
    ruleId:      WAVE_CANNON_TOWER_MISSED_RULE_ID,
    severity:    "Major",
    name:        "Missed Wave Cannon Tower Soak",
    description: "Was not hit by Wave Cannon, so their job was to soak one of the resulting towers — didn't soak any.",
    timestamp,
    player:      player.name,
    class:       player.className,
    specId:      player.specId,
    role:        player.role,
    abilityId:   WAVE_CANNON_TOWER_ABILITY_ID,
    abilityName: "Wave Cannon Tower",
  }));
}

function firstWaveCannonHitTimestamp(players: PlayerInfo[]): number | null {
  let earliest: number | null = null;
  for (const player of players) {
    for (const e of player.damageTaken) {
      if (e.abilityId !== WAVE_CANNON_ABILITY_ID) continue;
      if (earliest === null || e.timestamp < earliest) earliest = e.timestamp;
    }
  }
  return earliest;
}

/**
 * Resolves the DPS side's west-to-east conga order (M1-M2-R1-R2) for THIS
 * pull, or null if it can't be resolved confidently. R1/R2 (physical
 * ranged vs. caster) are already decisive from job alone via detectFFRoles
 * — the standard-comp ambiguity is M1 vs M2, which roles.ts's own header
 * calls "genuinely arbitrary" for two melee DPS (no job-based signal
 * distinguishes them, unlike MT/OT's opening-auto-attack tell). Resolved
 * here by ACTUAL POSITION instead: whichever of the 2 melee DPS is
 * standing further WEST (lower x) near this pull's own Wave Cannon moment
 * is labeled M1, matching the same west-to-east convention the support
 * side's fixed H2-H1-OT-MT order already uses — this only needs a
 * consistent WITHIN-PULL ordering, not a cross-report learned position
 * (unlike wave-cannon.ts's per-job spot table), so a single interpolated
 * position per melee player is enough. Fails closed (null) if either
 * melee's position can't be recovered near the moment — never guesses.
 */
function resolveDpsSideAssignments(players: PlayerInfo[], waveCannonTime: number): SideAssignment[] | null {
  const roles = detectFFRoles(players);
  const r1 = roles.find((a) => a.slot === "R1");
  const r2 = roles.find((a) => a.slot === "R2");
  if (!r1?.player || r1.tentative || !r2?.player || r2.tentative) return null;

  const meleePlayers = roles
    .filter((a) => a.slot === "M1" || a.slot === "M2")
    .map((a) => a.player)
    .filter((p): p is PlayerInfo => p !== null);
  if (meleePlayers.length !== 2) return null;

  const withPosition = meleePlayers.map((player) => ({
    player,
    pos: interpolatePlayerPosition(player, waveCannonTime, {
      windowMs:        WAVE_CANNON_ROLE_POSITION_WINDOW_MS,
      healing:         "self",
      healingReceived: "any",
      casts:           "self",
    }),
  }));
  if (withPosition.some((m) => !m.pos)) return null; // can't confirm — fail closed, don't guess

  withPosition.sort((a, b) => a.pos!.x - b.pos!.x); // ascending x = west to east
  const [west, east] = withPosition;

  return [
    { slot: "M1", player: west.player, tentative: false },
    { slot: "M2", player: east.player, tentative: false },
    { slot: "R1", player: r1.player,   tentative: false },
    { slot: "R2", player: r2.player,   tentative: false },
  ];
}

/**
 * Detects the specific non-carrier (on ONE side of the roster — support or
 * DPS) who should have covered an unsoaked Wave Cannon tower per that
 * side's fixed west-to-east priority, when everyone on that side actually
 * took SOME tower damage — the case detectWaveCannonTowerMissedErrors'
 * "zero damage" gate can't catch. See the WAVE CANNON SUPPORT TOWER
 * PRIORITY module comment — the DPS side (M1-M2-R1-R2, confirmed
 * 2026-07-30) runs the identical algorithm, just over the other 4 roster
 * slots. `sideAssignments` is pre-resolved by the caller (see
 * `resolveDpsSideAssignments` above for why the DPS side can't just use
 * detectFFRoles directly).
 */
function detectWaveCannonRolePriorityErrors(
  players:         PlayerInfo[],
  deathEvents:     DeathEvent[],
  enemyCasts:      EnemyEvent[],
  sideAssignments: SideAssignment[],
  congaOrder:      readonly FFRoleSlot[],
  congaLabel:      string
): PullError[] {
  // The fixed west-to-east ordering only means something when all 4 of
  // this side's roles resolved to a real, confident player.
  if (sideAssignments.length !== 4 || sideAssignments.some((a) => !a.player || a.tentative)) return [];

  const waveCannonHits: { player: PlayerInfo; timestamp: number; x?: number; y?: number }[] = [];
  const waveCannonInstances = new Set<number>();
  for (const player of players) {
    for (const e of player.damageTaken) {
      if (e.abilityId !== WAVE_CANNON_ABILITY_ID) continue;
      waveCannonHits.push({ player, timestamp: e.timestamp, x: e.x, y: e.y });
      if (e.sourceInstance !== undefined) waveCannonInstances.add(e.sourceInstance);
    }
  }
  if (waveCannonHits.length === 0) return [];
  const waveCannonTime = Math.min(...waveCannonHits.map((h) => h.timestamp));
  const carrierNames = new Set(waveCannonHits.map((h) => h.player.name));

  // Hard pre-gate, independent of the position-matching below: did a tower
  // genuinely go completely unsoaked this pull at all? Counts DISTINCT
  // tower NPC instances hit (any player, any side) against the number of
  // beam instances that dropped a tower — pure instance counting, not
  // identity, so it's unaffected by the sourceInstance-numbering mismatch
  // documented further down (same totalTowers/coveredInstances technique as
  // detectWaveCannonTowerMissedErrors above). Needed because nearest-
  // carrier position matching alone isn't reliable when two support
  // carriers stand close together (confirmed false positive, report
  // VtdBqhLQkWJXMvDg pull 1: H1/H2 stood ~5.6 yalms apart, both non-
  // carriers' actual soaks measured nearer to H1 than H2 even though no
  // Unmitigated Explosion fired — i.e. everything was actually fine).
  const coveredTowerInstances = new Set<number>();
  for (const player of players) {
    for (const e of player.damageTaken) {
      if (e.abilityId === WAVE_CANNON_TOWER_ABILITY_ID && e.sourceInstance !== undefined) {
        coveredTowerInstances.add(e.sourceInstance);
      }
    }
  }
  if (coveredTowerInstances.size >= waveCannonInstances.size) return [];

  const orderOf = (slot: FFRoleSlot) => congaOrder.indexOf(slot);
  const slotByName = new Map(sideAssignments.map((a) => [a.player!.name, a.slot]));

  // Carriers whose tower is on THIS side, each with the position they were
  // standing at when hit — a tower drops at its carrier's own feet, so
  // this position IS (approximately) the tower's location.
  const sideCarriers = waveCannonHits
    .filter((h) => slotByName.has(h.player.name) && h.x !== undefined && h.y !== undefined)
    .map((h) => ({ slot: slotByName.get(h.player.name)!, x: h.x!, y: h.y!, order: orderOf(slotByName.get(h.player.name)!) }));

  const nonCarriers = sideAssignments
    .filter((a) => !carrierNames.has(a.player!.name))
    .sort((a, b) => orderOf(a.slot) - orderOf(b.slot));

  // Needs exactly as many non-carriers as carriers on this side —
  // guaranteed by the 4-slot roster unless someone died and dropped out
  // entirely, in which case priority attribution isn't safe.
  if (sideCarriers.length === 0 || sideCarriers.length !== nonCarriers.length) return [];

  // A non-carrier who died before the towers could resolve can't be
  // blamed — cascade fallout, same gate as the other tower rules.
  const diedBeforeResolve = (playerName: string) =>
    deathEvents.some(
      (d) =>
        d.player === playerName &&
        d.timestamp >= waveCannonTime &&
        d.timestamp <= waveCannonTime + WAVE_CANNON_VOLLEY_CLUSTER_MS + 5000
    );
  if (nonCarriers.some((a) => diedBeforeResolve(a.player!.name))) return [];

  // Fixed west-to-east priority: the leftmost non-carrier takes the
  // leftmost open tower on this side, and so on — see module header.
  const openTowers = [...sideCarriers].sort((a, b) => a.order - b.order);
  const expectedAssignment = nonCarriers.map((a, i) => ({
    soaker:    a.player!,
    towerSlot: openTowers[i].slot,
    towerX:    openTowers[i].x,
    towerY:    openTowers[i].y,
  }));

  // A tower's own sourceInstance numbering is NOT shared with the Wave
  // Cannon beam's — confirmed 2026-07-30 (this report): the same volley's
  // beam instances are 1-4 while its towers' instances came back as 1 and
  // 10 in one pull, 2 in another. WHICH carrier a given tower soak belongs
  // to has to be resolved by NEAREST carrier position instead (see module
  // header) — every soak this loop sees is attributed to whichever of the
  // 4 carriers' own Wave-Cannon-hit position it landed closest to. Matched
  // against ALL 4 carriers, both sides (not just this side's 2), so a soak
  // that's really on the OTHER side lands on its real carrier and never
  // gets forced onto the nearer-of-only-2 option on this side — only kept
  // when the true nearest carrier turns out to be on THIS side.
  const soakedTowerSlotsByName = new Map<string, Set<FFRoleSlot>>();
  for (const player of players) {
    for (const e of player.damageTaken) {
      if (e.abilityId !== WAVE_CANNON_TOWER_ABILITY_ID || e.x === undefined || e.y === undefined) continue;
      let nearest: { slot: FFRoleSlot | null; dist: number } | null = null;
      for (const h of waveCannonHits) {
        if (h.x === undefined || h.y === undefined) continue;
        const dist = Math.hypot(e.x - h.x, e.y - h.y);
        if (!nearest || dist < nearest.dist) nearest = { slot: slotByName.get(h.player.name) ?? null, dist };
      }
      if (!nearest?.slot) continue; // nearest carrier was on the OTHER side
      const set = soakedTowerSlotsByName.get(player.name) ?? new Set<FFRoleSlot>();
      set.add(nearest.slot);
      soakedTowerSlotsByName.set(player.name, set);
    }
  }

  const coveredSlots = new Set<FFRoleSlot>();
  for (const slots of soakedTowerSlotsByName.values()) {
    for (const slot of slots) coveredSlots.add(slot);
  }
  // Every tower on this side got soaked by someone — the overlap rule
  // covers a player soaking 2+ towers; nothing to attribute here.
  if (coveredSlots.size >= openTowers.length) return [];

  const towerResolveTimestamp = enemyCasts
    .filter(
      (e) =>
        e.abilityId === WAVE_CANNON_TOWER_ABILITY_ID &&
        e.timestamp >= waveCannonTime &&
        e.timestamp <= waveCannonTime + WAVE_CANNON_VOLLEY_CLUSTER_MS + 5000
    )
    .reduce((min, e) => Math.min(min, e.timestamp), Infinity);
  const timestamp = Number.isFinite(towerResolveTimestamp) ? towerResolveTimestamp : waveCannonTime + 1;

  const errors: PullError[] = [];
  for (const { soaker, towerSlot } of expectedAssignment) {
    const actuallySoaked = soakedTowerSlotsByName.get(soaker.name) ?? new Set<FFRoleSlot>();
    if (actuallySoaked.has(towerSlot)) continue; // covered their assigned tower

    // A player who took ZERO tower damage this pull is already covered by
    // WAVE_CANNON_TOWER_MISSED's own "zero damage" gate — this rule exists
    // for the case that one CAN'T catch (took some tower damage, just the
    // wrong tower). Firing here too would double-flag the same miss.
    if (actuallySoaked.size === 0) continue;

    // Only flag when the tower they were supposed to cover is the one
    // that's actually left unsoaked — process of elimination confirms the
    // miss instead of guessing from priority alone.
    if (coveredSlots.has(towerSlot)) continue;

    const followedSlot = [...actuallySoaked][0];

    const description = `${congaLabel} priority order (${congaOrder.join("-")} west to east) made them responsible for the ${towerSlot} tower, but they soaked the ${followedSlot} tower alongside a teammate instead, leaving their own unsoaked.`;

    errors.push({
      ruleId:      WAVE_CANNON_TOWER_PRIORITY_RULE_ID,
      severity:    "Major",
      name:        "Missed Wave Cannon Tower Soak",
      description,
      timestamp,
      player:      soaker.name,
      class:       soaker.className,
      specId:      soaker.specId,
      role:        soaker.role,
      abilityId:   WAVE_CANNON_TOWER_ABILITY_ID,
      abilityName: "Wave Cannon Tower",
    });
  }
  return errors;
}

function detectWaveCannonSupportPriorityErrors(
  players:     PlayerInfo[],
  deathEvents: DeathEvent[],
  enemyCasts:  EnemyEvent[]
): PullError[] {
  const supportAssignments = detectFFRoles(players).filter((a) => (SUPPORT_CONGA_ORDER as readonly string[]).includes(a.slot));
  return detectWaveCannonRolePriorityErrors(players, deathEvents, enemyCasts, supportAssignments, SUPPORT_CONGA_ORDER, "Support");
}

function detectWaveCannonDpsPriorityErrors(
  players:     PlayerInfo[],
  deathEvents: DeathEvent[],
  enemyCasts:  EnemyEvent[]
): PullError[] {
  const waveCannonTime = firstWaveCannonHitTimestamp(players);
  if (waveCannonTime === null) return [];
  const dpsAssignments = resolveDpsSideAssignments(players, waveCannonTime);
  if (!dpsAssignments) return [];
  return detectWaveCannonRolePriorityErrors(players, deathEvents, enemyCasts, dpsAssignments, DPS_CONGA_ORDER, "DPS");
}

/**
 * An Unmitigated Explosion cast (fired once per Wave Cannon tower that goes
 * unresolved — see module header) marks the pull as over: it applies
 * raid-wide Damage Down moments later, so this fires a single Raid error
 * right at the cast itself, BEFORE those Damage Down applications, so
 * lib/report-data.ts's cutoff drops them as fallout instead of counting
 * them as fresh mistakes.
 */
function detectUnmitigatedExplosionWipeError(enemyCasts: EnemyEvent[]): PullError[] {
  const casts = enemyCasts.filter((e) => e.abilityId === UNMITIGATED_EXPLOSION_ABILITY_ID);
  if (casts.length === 0) return [];

  const timestamp = Math.min(...casts.map((e) => e.timestamp));

  return [
    {
      ruleId:      UNMITIGATED_EXPLOSION_WIPE_RULE_ID,
      severity:    "Raid",
      name:        "Unmitigated Explosion Wipe",
      description: "A Wave Cannon tower went unsoaked, triggering Unmitigated Explosion — unresolvable from here, the raid wiped.",
      timestamp,
      abilityId:   UNMITIGATED_EXPLOSION_ABILITY_ID,
      abilityName: "Unmitigated Explosion",
    },
  ];
}

/**
 * A death to Mystery Magic's resolution (either spread tick flavor, or
 * Blizzard III Blowout — see MYSTERY_MAGIC_DEATH_ABILITY_IDS) leaves Wave
 * Cannon unresolvable (it already self-gates on 4 live carriers) and marks
 * the pull as over. This fires a single Raid error just after the death
 * (and any Major error(s) it produced) purely to serve as the
 * lib/report-data.ts cutoff — see module comment.
 */
function detectMysteryMagicDeathWipeError(
  deathEvents:      DeathEvent[],
  otherPhase1Errors: PullError[]
): PullError[] {
  const mysteryMagicDeaths = deathEvents.filter((d) => MYSTERY_MAGIC_DEATH_ABILITY_IDS.has(d.killingAbilityGameId));
  if (mysteryMagicDeaths.length === 0) return [];

  const firstDeathTime = Math.min(...mysteryMagicDeaths.map((d) => d.timestamp));
  const clusterEnd = firstDeathTime + MYSTERY_MAGIC_VOLLEY_CLUSTER_MS;

  const clusterDeaths = mysteryMagicDeaths.filter((d) => d.timestamp <= clusterEnd);
  const clusterMajors = otherPhase1Errors.filter(
    (e) => e.severity === "Major" && e.timestamp >= firstDeathTime - MYSTERY_MAGIC_VOLLEY_CLUSTER_MS && e.timestamp <= clusterEnd
  );

  const cutoff = Math.max(
    ...clusterDeaths.map((d) => d.timestamp),
    ...clusterMajors.map((e) => e.timestamp)
  );

  const victims = [...new Set(clusterDeaths.map((d) => d.player))];

  return [
    {
      ruleId:      MYSTERY_MAGIC_DEATH_WIPE_RULE_ID,
      severity:    "Raid",
      name:        "Mystery Magic Wipe",
      description: `${victims.join(" and ")} died during Mystery Magic — unresolvable from here, the raid wiped.`,
      timestamp:   cutoff + 1,
      abilityId:   0,
      abilityName: "Mystery Magic",
    },
  ];
}

/**
 * A player who ever had Double-Trouble Trap ("Confetti") applied dying
 * shortly afterward makes the mechanic unresolvable — a single Raid error
 * fires once, purely as the lib/report-data.ts cutoff marker. See module
 * header for why this checks debuff HISTORY (any application before the
 * death, within a generous window) rather than "still active at death."
 */
function detectConfettiLostError(players: PlayerInfo[], deathEvents: DeathEvent[]): PullError[] {
  const hadConfettiBefore = (playerName: string, atTime: number) => {
    const player = players.find((p) => p.name === playerName);
    if (!player) return false;
    return player.debuffs.some(
      (d) =>
        d.abilityId === DOUBLE_TROUBLE_TRAP_BUFF_ID &&
        d.debuffStatus === "applied" &&
        d.timestamp <= atTime &&
        atTime - d.timestamp <= CONFETTI_DEATH_WINDOW_MS
    );
  };

  const confettiDeath = deathEvents
    .filter((d) => hadConfettiBefore(d.player, d.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp)[0];
  if (!confettiDeath) return [];

  return [
    {
      ruleId:      CONFETTI_LOST_RULE_ID,
      severity:    "Raid",
      name:        "Confetti Lost",
      description: `${confettiDeath.player} died while carrying Double-Trouble Trap ("Confetti") — unresolvable from here, the raid wiped.`,
      timestamp:   confettiDeath.timestamp + 1,
      abilityId:   DOUBLE_TROUBLE_TRAP_BUFF_ID,
      abilityName: "Double-Trouble Trap",
    },
  ];
}

type ConfettiApply = { player: PlayerInfo; timestamp: number };

function collectConfettiApplies(players: PlayerInfo[]): ConfettiApply[] {
  const applies: ConfettiApply[] = [];
  for (const player of players) {
    for (const d of player.debuffs) {
      if (d.abilityId !== DOUBLE_TROUBLE_TRAP_BUFF_ID || d.debuffStatus !== "applied") continue;
      applies.push({ player, timestamp: d.timestamp });
    }
  }
  return applies.sort((a, b) => a.timestamp - b.timestamp);
}

type ConfettiResolution = {
  holders: ConfettiApply[]; // the original 2 carriers (first sub-wave) — see module header on why a later reapplication wave isn't tracked here at all (proved unreliable as a position signal)
};

// Confirmed across every sampled report: within ONE resolution, a
// residual "caught by the blast" debuff reapplication (if any) lands
// ~5.7s after the original holders' own application. A genuinely
// SEPARATE, independent SECOND Confetti resolution later in a long pull
// starts ~69s after the first — comfortably past this gap, so grouping
// applies into clusters split at this threshold correctly keeps each
// resolution's own holders together without a later resolution's
// legitimate holders being mistaken for the first resolution's fallout
// (confirmed bug: report VtdBqhLQkWJXMvDg pull 2 has 3 waves total —
// holders, then a residual reapplication 5.7s later, then a WHOLLY
// SEPARATE second resolution's own 2 holders 68.7s after that — an
// earlier version of this code treated all 4 non-first-wave players as
// victims of the first resolution).
const CONFETTI_RESOLUTION_GAP_MS = 15_000;

function collectConfettiResolutions(players: PlayerInfo[]): ConfettiResolution[] {
  const applies = collectConfettiApplies(players);
  if (applies.length === 0) return [];

  const groups: ConfettiApply[][] = [];
  for (const a of applies) {
    const current = groups[groups.length - 1];
    if (current && a.timestamp - current[current.length - 1].timestamp <= CONFETTI_RESOLUTION_GAP_MS) {
      current.push(a);
    } else {
      groups.push([a]);
    }
  }

  return groups.map((group) => {
    const firstWaveTime = group[0].timestamp;
    return { holders: group.filter((a) => a.timestamp - firstWaveTime <= CONFETTI_HOLDER_WAVE_CLUSTER_MS) };
  });
}

/**
 * The moment a resolution's position should be read — ~half a second
 * before the knockback's own damage lands (see CONFETTI_SNAPSHOT_LEAD_MS)
 * — anchored on THIS resolution's own explosion hits (within a window
 * after its holders' application), or undefined if that resolution's
 * knockback damage isn't in the log at all.
 */
function confettiSnapshotTime(players: PlayerInfo[], firstWaveTime: number): number | undefined {
  const explosionTimestamps = players
    .flatMap((p) => p.damageTaken)
    .filter(
      (e) =>
        e.abilityId === CONFETTI_EXPLOSION_ABILITY_ID &&
        e.timestamp >= firstWaveTime &&
        e.timestamp <= firstWaveTime + CONFETTI_RESOLUTION_GAP_MS
    )
    .map((e) => e.timestamp);
  if (explosionTimestamps.length === 0) return undefined;
  return Math.min(...explosionTimestamps) - CONFETTI_SNAPSHOT_LEAD_MS;
}

/**
 * Detects a non-holder "stack" player standing too far from — or too
 * close to — the boss's own hitbox ring when their side's Confetti
 * detonated. See module header: this REPLACES an earlier, DISPROVEN
 * debuff-reapplication check. Per the user, the transferred Double-
 * Trouble Trap debuff lands on a RANDOM member of whoever the blast
 * actually hit, not necessarily the most-mispositioned one — confirmed:
 * Sonder Dreams, Kade Kansado, and Ayumi Emi were ALL hit by the same
 * explosion instance, yet only Ayumi happened to inherit the debuff, and
 * Sonder is independently confirmed correctly positioned despite being
 * hit too. Geometry (distance from the hitbox ring) is the only reliable
 * signal here. Only the FIRST resolution's axis is confirmed — see
 * detectConfettiHolderMisplacedErrors' own comment on why later
 * resolutions are left alone for now.
 */
function detectConfettiKnockbackVictimErrors(players: PlayerInfo[]): PullError[] {
  const errors: PullError[] = [];

  for (const { holders } of collectConfettiResolutions(players).slice(0, 1)) {
    if (holders.length === 0) continue;

    const snapshotTime = confettiSnapshotTime(players, holders[0].timestamp);
    if (snapshotTime === undefined) continue;

    const holderNames = new Set(holders.map((h) => h.player.name));
    const stack = players.filter((p) => !holderNames.has(p.name));

    for (const player of stack) {
      const pos = interpolatePlayerPosition(player, snapshotTime, {
        windowMs:        CONFETTI_POSITION_WINDOW_MS,
        healing:         "self",
        damageTaken:     false,
        casts:           "self",
        healingReceived: "any",
      });
      if (!pos) continue; // can't confirm their position — fail closed, don't guess

      const dist = distanceFromCenter(pos.x, pos.y);
      const tooFar  = dist > CONFETTI_HITBOX_RADIUS_CENTIYALMS + CONFETTI_STACK_OVERSHOOT_TOLERANCE_CENTIYALMS;
      const tooNear = dist < CONFETTI_HITBOX_RADIUS_CENTIYALMS - CONFETTI_STACK_UNDERSHOOT_TOLERANCE_CENTIYALMS;
      if (!tooFar && !tooNear) continue; // within normal jitter of the hitbox ring

      errors.push({
        ruleId:      CONFETTI_KNOCKBACK_VICTIM_RULE_ID,
        severity:    "Major",
        name:        "Confetti Stack Misplaced",
        description: `Was roughly ${(dist / 100).toFixed(1)} yalms from the boss when Confetti detonated — ${tooFar ? "too far out" : "too close in"}, should have been hugging the boss's hitbox so the knockback carried them cleanly across the arena.`,
        timestamp:   snapshotTime,
        player:      player.name,
        class:       player.className,
        specId:      player.specId,
        role:        player.role,
        abilityId:   DOUBLE_TROUBLE_TRAP_BUFF_ID,
        abilityName: "Double-Trouble Trap",
      });
    }
  }

  return errors;
}

/**
 * Detects a Confetti HOLDER (the source of their own detonation, not a
 * victim of it) standing off the expected due-west (Support) / due-east
 * (DPS) line from arena center — see module header for the mechanic, the
 * interpolated-position technique, and why this needs its own check
 * (holders have no reliable outcome signal to gate on — see
 * detectConfettiKnockbackVictimErrors — since they ARE the explosion).
 * Runs once per resolution instance (see collectConfettiResolutions — a
 * long pull can have more than one).
 */
function detectConfettiHolderMisplacedErrors(players: PlayerInfo[]): PullError[] {
  const errors: PullError[] = [];

  // Only the FIRST resolution's due-west/due-east axis is confirmed (see
  // module header). A pull that survives long enough shows a SECOND
  // Confetti-shaped resolution ~69s later (same debuff ID) whose holders
  // consistently read ~85-100° off this same axis — far too consistent
  // to be everyone failing identically, and much closer to "the true axis
  // for this later resolution isn't east/west at all" (the tight
  // clustering near 90° hints at north/south instead). Left undetected
  // until that's actually confirmed, same as this file's other
  // deliberately-conservative gates.
  for (const { holders } of collectConfettiResolutions(players).slice(0, 1)) {
    if (holders.length === 0) continue;

    const snapshotTime = confettiSnapshotTime(players, holders[0].timestamp);
    if (snapshotTime === undefined) continue;

    for (const { player } of holders) {
      const pos = interpolatePlayerPosition(player, snapshotTime, {
        windowMs:        CONFETTI_POSITION_WINDOW_MS,
        healing:         "self",
        damageTaken:     false,
        casts:           "self",
        healingReceived: "any",
      });
      if (!pos) continue; // can't confirm their position — fail closed, don't guess

      const dx = pos.x - ARENA_CENTER;
      const dy = pos.y - ARENA_CENTER;
      const dist = Math.hypot(dx, dy);
      if (dist < CONFETTI_MIN_DIST_FOR_BEARING_CENTIYALMS) continue; // too close to center to read a meaningful bearing at all

      const expectedSign = SUPPORT_ROLES.has(player.role) ? -1 : 1; // Support -> west (-x), DPS -> east (+x)
      const cosTheta = (dx * expectedSign) / dist;
      const angleDeg = Math.acos(Math.min(1, Math.max(-1, cosTheta))) * 180 / Math.PI;
      if (angleDeg < CONFETTI_HOLDER_ANGLE_TOLERANCE_DEG) continue; // within normal jitter of the expected line

      const expectedDir = expectedSign < 0 ? "west" : "east";
      errors.push({
        ruleId:      CONFETTI_HOLDER_MISPLACED_RULE_ID,
        severity:    "Major",
        name:        "Confetti Holder Misplaced",
        description: `Was roughly ${angleDeg.toFixed(0)}° off the expected due-${expectedDir} line from the boss when their Confetti detonated — should have been standing directly ${expectedDir}, further out than their stack.`,
        timestamp:   snapshotTime,
        player:      player.name,
        class:       player.className,
        specId:      player.specId,
        role:        player.role,
        abilityId:   DOUBLE_TROUBLE_TRAP_BUFF_ID,
        abilityName: "Double-Trouble Trap",
      });
    }
  }

  return errors;
}

function detectTeleTrouncingArrowErrors(players: PlayerInfo[]): PullError[] {
  type Removal = { player: PlayerInfo; timestamp: number; dir: Cardinal };
  const removals: Removal[] = [];
  for (const player of players) {
    for (const d of player.debuffs) {
      const dir = TELE_PORTENT_DIRECTION_BY_ABILITY_ID[d.abilityId];
      if (!dir || d.debuffStatus !== "removed") continue;
      removals.push({ player, timestamp: d.timestamp, dir });
    }
  }
  if (removals.length === 0) return [];

  removals.sort((a, b) => a.timestamp - b.timestamp);
  const waves: Removal[][] = [];
  for (const r of removals) {
    const current = waves[waves.length - 1];
    if (current && r.timestamp - current[current.length - 1].timestamp <= TELE_PORTENT_WAVE_CLUSTER_MS) {
      current.push(r);
    } else {
      waves.push([r]);
    }
  }

  // Each player should appear in exactly 2 waves (one arrow apiece) — group
  // their 2 removals back together regardless of which wave they landed in.
  const byPlayer = new Map<number, { player: PlayerInfo; arrows: { timestamp: number; dir: Cardinal }[] }>();
  for (const wave of waves) {
    for (const r of wave) {
      const entry = byPlayer.get(r.player.actorId) ?? { player: r.player, arrows: [] };
      entry.arrows.push({ timestamp: r.timestamp, dir: r.dir });
      byPlayer.set(r.player.actorId, entry);
    }
  }

  const errors: PullError[] = [];

  for (const { player, arrows } of byPlayer.values()) {
    if (arrows.length !== 2) continue; // incomplete data — fail closed

    // damageTaken's x/y is this player's OWN position (the hit victim).
    // player.healing is NOT usable here despite carrying x/y too — those
    // coordinates belong to whoever THIS player healed, not to this player
    // themselves (see fflHealToPlayerEvent's comment on FFLHealEvent.
    // targetResources) — confirmed as the exact cause of a false positive
    // (Sage flagged 18y off in pull 6): the nearest-in-time event to one of
    // their removedebuffs was their own outgoing heal on a raid-wide
    // support cast (Kardia) whose target was standing across the arena.
    const withPos = arrows.map((a) => ({ ...a, pos: nearestPlayerPosition(player.damageTaken, a.timestamp) }));
    if (withPos.some((a) => a.pos === null)) continue;
    const [a1, a2] = withPos as { timestamp: number; dir: Cardinal; pos: Point }[];

    const flagIfOutOfPosition = (arrow: { timestamp: number; dir: Cardinal; pos: Point }, expected: Point, threshold: number) => {
      const deviation = pointDistance(arrow.pos, expected);
      if (deviation <= threshold) return;
      errors.push({
        ruleId:      TELE_TROUNCING_ARROW_RULE_ID,
        severity:    "Major",
        name:        "Tele-Trouncing Arrow Misplaced",
        description: `Dropped their ${arrow.dir}-facing arrow roughly ${deviation.toFixed(1)} yalms from its expected spot in the clockwise arrow path.`,
        timestamp:   arrow.timestamp,
        player:      player.name,
        class:       player.className,
        specId:      player.specId,
        role:        player.role,
        abilityId:   47801,
        abilityName: "Tele-Trouncing",
      });
    };

    if (a1.dir === a2.dir) {
      const [slotA, slotB] = predictDoubleSlots(a1.dir);
      const straight = pointDistance(a1.pos, slotA) + pointDistance(a2.pos, slotB);
      const swapped  = pointDistance(a1.pos, slotB) + pointDistance(a2.pos, slotA);
      const [p1, p2] = straight <= swapped ? [slotA, slotB] : [slotB, slotA];
      flagIfOutOfPosition(a1, p1, ARROW_DOUBLE_OUT_OF_POSITION_THRESHOLD_YALMS);
      flagIfOutOfPosition(a2, p2, ARROW_DOUBLE_OUT_OF_POSITION_THRESHOLD_YALMS);
    } else {
      const predicted = predictCornerSlots(a1.dir, a2.dir);
      if (!predicted) continue; // not a valid clockwise-adjacent pair — unexpected data, skip
      for (const arrow of [a1, a2]) {
        const expected = arrow.dir === predicted.cornerDir ? predicted.cornerPos : predicted.approachPos;
        flagIfOutOfPosition(arrow, expected, ARROW_OUT_OF_POSITION_THRESHOLD_YALMS);
      }
    }
  }

  return errors;
}

/**
 * Returns [] immediately for any pull that never touches Phase 1's tracked
 * abilities — self-gating the same way exdeath.ts does, so it's safe to
 * always call.
 */
export function detectPhase1Errors(
  players:     PlayerInfo[],
  deathEvents: DeathEvent[],
  enemyCasts:  EnemyEvent[] = []
): PullError[] {
  const blizzardIIISilentKillErrors = detectBlizzardIIIBlowoutSilentKillErrors(players, deathEvents);

  return [
    ...detectRevoltingRuinThreatLossErrors(players),
    ...blizzardIIISilentKillErrors,
    ...detectJumpedOffArenaError(players, deathEvents),
    ...detectWaveCannonTowerOverlapErrors(players, deathEvents),
    ...detectWaveCannonTowerMissedErrors(players, deathEvents, enemyCasts),
    ...detectWaveCannonSupportPriorityErrors(players, deathEvents, enemyCasts),
    ...detectWaveCannonDpsPriorityErrors(players, deathEvents, enemyCasts),
    ...detectUnmitigatedExplosionWipeError(enemyCasts),
    ...detectMysteryMagicDeathWipeError(deathEvents, blizzardIIISilentKillErrors),
    ...detectConfettiLostError(players, deathEvents),
    ...detectConfettiKnockbackVictimErrors(players),
    ...detectConfettiHolderMisplacedErrors(players),
    ...detectTeleTrouncingArrowErrors(players),
  ].sort((a, b) => a.timestamp - b.timestamp);
}
