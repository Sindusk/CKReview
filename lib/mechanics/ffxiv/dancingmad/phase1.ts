// lib/mechanics/ffxiv/dancingmad/phase1.ts
//
// Encounter-specific error detection for Phase 1 of FFXIV's Dancing Mad
// (Kefka's Return) ultimate — everything up through the phase transition
// at roughly 3:25 (205s) into the fight.
//
// ── REVOLTING RUIN III THREAT LOSS (confirmed 2026-07-29, Q3GzJNZg64k1hLRm, ─
// ── pull 7; recurrence + raid-wipe outcome confirmed 2026-07-30, pull 26) ──
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
// **Revolting Ruin III is NOT a one-time opening mechanic — it recurs**
// (confirmed pulls 26/29: a second hit-1/hit-2 pair ~80-90s after the
// opening pair, immediately following the Light-Party Graven 2 stack/spread
// resolution). Each occurrence must be judged independently: an early
// version of this rule pooled every hit-1/hit-2 target across the WHOLE
// pull into one check, so occurrence 1 resolving cleanly (MT tanked both)
// masked occurrence 2's real failure. Fixed by clustering hit-1 events into
// distinct occurrences (grouped by proximity, REVOLTING_RUIN_OCCURRENCE_GAP_MS)
// and evaluating each occurrence's own hit-1/hit-2 pair against only that
// occurrence's own event window.
//
// **The MT dying to hit 1 itself is a mitigation issue, not a threat
// issue, and must NOT flag the OT** (corrected 2026-07-30, pull 26 —
// overturns an earlier ruling on this same pull). First read: pull 26's
// occurrence 2 has Salty Dango (MT) die to hit 1, and hit 2 then lands on
// six OTHER players — the rule's "hit 2 didn't land on the MT -> flag OT"
// logic fired on Sayacissa Morsaelth. But per the user (having watched the
// VOD), this raid's early-progression strategy for this occurrence is
// simply "MT tanks both hits" with the OT provoking only as a backup —
// Sayacissa executed correctly; Dango just died to hit 1 outright (a
// mitigation/cooldown problem, unrelated to anyone's threat). Since hit 2
// literally cannot land on a dead MT, blaming the OT for that outcome is
// exactly the "death fallout is never flagged" trap the README warns
// about. Fixed by skipping the OT-blame check entirely whenever the MT is
// already dead by the time hit 2 resolves (`mtDiedBeforeHit2`) — the OT
// only flags when the MT was ALIVE and hit 2 still went elsewhere, the
// pull-7 shape this rule was originally built for.
//
// **A non-tank dying to either hit is itself a raid-wide unresolvable
// outcome**, independent of the OT-threat check above — confirmed pull 26:
// once Salty Dango died to occurrence 2's hit 1, hit 2 hit SIX other
// players simultaneously (Sonder Dreams, Azura Salus, Archidel Del'archi,
// Kade Kansado, Ayumi Emi, Chauzey Solstice) and killed them all — a
// tankbuster sized for a mitigated tank is lethal raid-wide when it lands
// on an unmitigated non-tank instead, regardless of WHY it landed there.
// See detectRevoltingRuinNonTankDeathError below — same Raid-severity
// cutoff shape as GRAVEN_1_DEATH_WIPE_RULE_ID/CONFETTI_LOST_RULE_ID/
// UNMITIGATED_EXPLOSION_WIPE_RULE_ID.
//
// **Revolting Ruin III is a CONE AoE, and only a tank is supposed to ever
// get hit by it** (confirmed 2026-07-30, pull 29, revisited after further
// VOD review — supersedes the original read that Azura Salus's death that
// pull was pure unavoidable splash). Confirmed failure: Azura Salus
// (Healer) walked north into the cone's range before hit 2 landed, right
// next to the tanking Dango, and died to it. Detection is deliberately an
// OUTCOME check (did the cone's own damage actually land on them — i.e.
// are they in hit 1 or hit 2's own target set), NOT a north/south position
// check — a position-based first version produced a false-positive
// pattern on a DIFFERENT report/team's melee DPS (G7kTFVxjcAC6p1MN:
// Sayacissa Morsaelth, a Dragoon, consistently measured slightly north
// almost every pull without ever actually being hit — per the user, melee
// routinely drift north chasing positionals and that's fine as long as
// they stay outside the cone's actual radius; only getting hit is the real
// mistake). BOTH tanks are exempt, not just whichever one actually tanked
// hit 1 that occurrence — which tank ends up holding it varies (sometimes
// MT, sometimes OT provokes and takes over), and either way the other tank
// may legitimately also be caught by it. See
// detectRevoltingRuinOutOfPositionErrors below.
//
// ── GRAVEN 2 SPREAD MISPLACED (confirmed 2026-07-30, report ─────────────────
// ── Q3GzJNZg64k1hLRm, pull 31) ───────────────────────────────────────────
//
// Graven 2's Gravitas Puddles (47788) stack the raid into its 2 fixed
// light parties (LP1/LP2, NOT a role split — confirmed both LPs can be a
// mix of tank/healer/DPS) on opposite sides of the arena. What follows,
// Vitrophyre (47792, "Spread"), requires ONE role category — Support
// (Tank+Healer) on some pulls, DPS on others, same random-per-pull
// telegraph as Graven Image's spread half — to break off and stand
// individually far enough apart that each of their own personal Vitrophyre
// explosions doesn't reach anyone else, while the OTHER role category
// stacks at the boss's own hitbox instead. Per the user and the raid's own
// strategy sheet (image "Graven2Spread," drawn for the newer 8-player-
// stack strategy but confirmed identical for this — the tank/melee spread
// slots don't change between strategies): whichever role fills the "first"
// slot (MT for Support, M1 for DPS) spreads EAST; whichever fills the
// "second" slot (OT for Support, M2 for DPS) spreads WEST. The other two
// spreading slots' own exact positions aren't confirmed yet.
//
// Confirmed failure (pull 31, Support spread): Salty Dango (MT) stayed
// north, near the boss hitbox, instead of moving out east — close enough
// that his own Vitrophyre explosion (its own FFLogs sourceInstance) also
// caught Sonder Dreams, who was correctly hugging the hitbox as a DPS that
// pull. Sonder died to it. Sayacissa Morsaelth (OT) is confirmed in the
// SAME pull to have correctly spread west (her own instance hit nobody
// else), giving a clean contrast pair.
//
// Detection deliberately does NOT need the exact confirmed compass
// bearings — a pure OUTCOME/overlap check (a spreader's own instance hit
// 2+ people) is enough, the same technique WAVE_CANNON_TOWER_OVERLAP_RULE_ID
// already uses, and it generalizes to the two still-unconfirmed spread
// slots for free. The only judgment call needed is WHO to blame when an
// instance catches 2+ people: whichever of them actually belongs to the
// spreading role category (Support or DPS, whichever is majority among
// everyone Vitrophyre hit this resolution) is the one who should have
// been standing apart — an innocent bystander from the OTHER role
// category (like Sonder here, hugging the hitbox where he belonged) isn't
// blamed for getting clipped. If an overlap instance has zero or 2+
// legitimate spreaders sharing it, that's ambiguous — stay silent rather
// than guess (e.g. two Support players overlapping each other, which
// slot-assignment mistake actually caused it isn't derivable from this
// signal alone).
//
// ── GRAVEN 2 DEATH -> UNRESOLVABLE (confirmed 2026-07-30, same pull) ────────
//
// Per the user: once ANYONE dies during Graven 2 (from the Gravitas
// Puddles cast onward), the rest of the mechanic — and everything chained
// after it (the tankbuster, Confetti Knockback, Puddle Soaks) — becomes
// difficult to impossible to resolve cleanly. Confirmed pull 31: Sonder's
// death (above) is immediately followed by a genuinely messy back half —
// the tankbuster's own threat gets scrambled, and the pull ends in a
// GRAVITATIONAL_EXPLOSION_WIPE_RULE_ID a few seconds later. A single Raid
// error fires right after the first Graven-2-scoped death, same cutoff
// shape as every other rule in this file that does this — see
// detectGraven2DeathWipeError below.
//
// The window's own UPPER edge is bounded at the SECOND Confetti
// detonation (the Gravity III puddle soaks immediately following it are
// Graven 2's last beat) rather than running all the way to PHASE_1_END_MS
// — confirmed 2026-07-30, pull 36: an unrelated death well after Graven 2
// had already resolved (a missed Hyperdrive tankbuster, mid-transition
// into Tele-Trouncing) was wrongly swept up as a "Graven 2 death" by the
// old unbounded-to-PHASE_1_END_MS window, since it still technically fell
// before PHASE_1_END_MS. That Hyperdrive death is deliberately left
// undetected for now (see CONFETTI_LOST below for what it DOES trigger)
// — the user wasn't sure what's changed strategically around who should
// hold Invulnerability for it, so no rule is built for it yet.
//
// ── GRAVEN 2 PUDDLE PROXIMITY (confirmed 2026-07-30, report ─────────────────
// ── Q3GzJNZg64k1hLRm, pull 51) ───────────────────────────────────────────
//
// The per-player cause behind GRAVITATIONAL_EXPLOSION_WIPE_RULE_ID above,
// for the specific shape the user could actually attribute from the VOD:
// a spreader landing too close to the OTHER lingering Gravitas puddle from
// this same stack/spread beat (see module header's opening paragraph),
// rather than too close to another spreader (that's
// GRAVEN_2_SPREAD_MISPLACED_RULE_ID). The 2 puddles sit wherever each
// light party stacked for the Gravitas Puddles (47788) cast — computed
// as the centroid of each LP's own damageTaken position at that moment
// (all 4 members share one spot), split north/south of arena center, the
// same technique graven-image.ts's layout learner uses for its own two
// mirrored halves.
//
// Confirmed failure (pull 51): Archidel Del'archi spread to within ~1032
// centiyalms of the nearest puddle centroid and the Gravitational
// Explosion (47789) fired moments later, wiping the raid. The other 3
// spreaders that same resolution were clean with real margin: Salty Dango
// ~1334, Sayacissa Morsaelth ~1443, Azura Salus ~1581 — floor set at the
// midpoint between the failure and the nearest clean sample.
//
// Gated on GRAVITATIONAL_EXPLOSION_WIPE_RULE_ID actually firing this pull
// — with only one confirmed failure sample to calibrate from, staying
// silent on pulls that resolved cleanly avoids risking a false positive
// on a merely-close-but-fine spread (same "only check on failure"
// precedent as detectWaveCannonRolePriorityErrors, per the user directly).
// Timestamped 1ms before the wipe cutoff's own cast timestamp (not the
// spreader's own Vitrophyre hit, which lands slightly AFTER the
// explosion's cast fires) so it sorts immediately before the wipe entry,
// same ordering trick detectTeleTrouncingDeathWipeError's `cutoff + 1` uses.
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
// ── TELE-TROUNCING RESOLUTION (confirmed 2026-07-30, pull 41) ──────────────
//
// After the arrows are placed (above) AND the third/final Confetti
// detonates (see CONFETTI FINAL POSITION), the raid gets tethered offscreen
// to a statue and split into 2 tagged groups: one side (Idyllic Will,
// TELE_TROUNCING_WILL_ABILITY_ID) takes an AoE that kills anyone standing
// near the target, followed by Sleep; the other (Indulgent Will) gets
// Confused (auto-walks toward the nearest ally and, on reaching melee
// range, one-shots them). Resolution: the Slept player baits the nearest
// Confused player onto their own Tele-Trouncing arrow, riding the
// teleport it drops long enough that the Confused player never gets an
// attack off. If any arrow doesn't get soaked this way, Phase 2 (required
// before Phase 3) can't be passed.
//
// Per the user directly, the assignment uses FIXED BAIT positions on the
// same N/E/S/W ring the arrows already use — melee on the INSIDE of their
// arrow, ranged on the OUTSIDE: MT+R1 north, OT+R2 west, M1+H1 south,
// M2+H2 east (see DMUGraven3FixedTether reference image). Not yet built —
// pull 41 was too chaotic (only Sayacissa Morsaelth and Archidel Del'archi
// were correctly positioned; the rest were off by varying degrees) to
// calibrate a distance/position threshold from, so positioning detection
// is deferred to a cleaner sample.
//
// What IS built for now: a simple Raid-severity cutoff (same shape as
// CONFETTI_LOST/GRAVEN_1_DEATH_WIPE) on a death to the AoE side's own
// damage (Idyllic Will) — per the user, dying to this initial hit means
// the mechanic never gets a chance to resolve via baiting at all.
// Confirmed pull 41: 4 players (Ayumi Emi, Chauzey Solstice, Kade Kansado,
// Sonder Dreams) died to Idyllic Will within 45ms of each other — clustered
// too close together, so each one's own AoE also caught the others.
//
// ── GRAVEN 1 DEATH -> UNRESOLVABLE WIPE (confirmed 2026-07-28, ─────────────
// ── report Q3GzJNZg64k1hLRm, pulls 1/2; scope-narrowed 2026-07-30, pull 26) ─
//
// Mystery Magic (begincast/cast 47764) resolves ~1-16s later with a
// raid-wide AoE tick in one of two elemental flavors — Flagrant Fire III
// (47778/47779) or Thrumming Thunder III (47775/47776/47777). A separate
// concurrent cast, Blizzard III Blowout (BLIZZARD_III_BLOWOUT_ABILITY_IDS
// above), is also part of the same mechanic package. There can be more than
// one Mystery Magic occurrence in a pull — confirmed pull 26 has one at
// ~38s (following the pull's only Graven Image cast, 48370, at ~30s) and a
// SECOND one at ~55s with no Graven Image cast of its own in between —
// so this gate keys off Mystery Magic's own cast (47764) directly, not
// Graven Image.
//
// **Only the FIRST Mystery Magic in a pull is unconditionally unresolvable
// on a death.** Confirmed failure (pull 1/2): Wave Cannon directly follows
// the first Mystery Magic and needs all 8 players alive to resolve (it
// already self-gates on exactly 4 live carriers — see
// WAVE_CANNON_TOWER_OVERLAP module comment) — so a death here really does
// end the pull. Confirmed COUNTEREXAMPLE (pull 26): Azura Salus died to the
// SECOND Mystery Magic (~55s) — but Wave Cannon had already resolved by
// then (confirmed at ~43s, between the two Mystery Magic casts), so the
// raid could simply rez her and continue prog on the next mechanic; this is
// NOT a wipe and must not cut the pull's per-player analysis short. Gated
// by taking the timestamp of the pull's SECOND Mystery Magic cast (if any)
// and only counting deaths strictly before it — a later occurrence's own
// deaths are real player mistakes (already covered by graven-image.ts /
// the eventual Graven 2 rules) but don't trigger this cutoff.
//
// Renamed from "Mystery Magic Wipe"/MYSTERY_MAGIC_DEATH_WIPE_RULE_ID to be
// explicitly Graven-1-scoped (name, rule id, and description) now that the
// rule only ever fires for that first occurrence — the old name implied it
// covered every Mystery Magic resolution, which was never true even before
// this fix (a later occurrence's death was never actually a wipe; it just
// hadn't been proven wrong yet).
//
// What WAS missing (still true for the first occurrence): nothing marked
// the pull as over at the point of death, so later incidental errors (e.g.
// generic Damage Down procs from a raid already spiraling toward a call)
// kept counting as real mistakes. A Raid-severity error now fires once,
// timestamped just after the death, functioning purely as the
// lib/report-data.ts cutoff marker — see that file's "once a raid-wide
// mistake has happened... Major errors after that point are dropped"
// logic, the same mechanism JUMPED_OFF_ARENA relies on above.
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
// Per the user directly: raid-cutoff descriptions across this file should
// avoid asserting a definitive outcome like "the raid wiped" — a raid-wide
// mistake this severe is treated as a cutoff point for further per-player
// analysis regardless of whether the group actually resets or reses and
// pushes on to prog the next mechanic (pull 26 is exactly that case).
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
// ── CONFETTI GROUP MISPLACED / HEADCOUNT REQUIREMENT (confirmed ────────────
// ── 2026-07-30, same report, pull 34) ───────────────────────────────────────
//
// The SECOND resolution above (the one whose axis wasn't confirmed) turns
// out not to need its exact compass bearing at all — same "outcome over
// geometry" lesson as REVOLTING_RUIN_OUT_OF_POSITION. Per the user
// directly: **each Confetti explosion instantly kills everyone it hits
// unless its holder plus 3 OTHER players are caught in it — 4 total.**
// This holds for every one of the fight's 3 independent detonations (the
// first, already built above; this second one; and the third, during
// Tele-Trouncing/Arrows, not built yet). Confirmed failure (pull 34):
// Sayacissa Morsaelth (Tank) stacked with the DPS group instead of her
// own Support group for the second detonation — her own explosion
// instance (sourceInstance grouping, same technique as
// GRAVEN_2_SPREAD_MISPLACED) still had its normal 4 (holder Chauzey
// Solstice + 3 DPS), but the Support explosion (holder Azura Salus) was
// left with only 2 (Azura + Archidel Del'archi) instead of 4 — one short
// of 3 — and its damage scaled up massively as a result (confirmed: a
// clean/full instance in this same pull hits for ~50-100k; the
// undermanned instance hit for ~204-205k, instakilling both Azura and
// Archidel, INCLUDING the holder herself). Per the user, this is not
// Azura's or Archidel's fault — they did nothing wrong; the entire
// consequence traces back to Sayacissa's misplacement alone.
//
// Detection (`detectConfettiGroupMisplacedErrors`) doesn't need to know
// which compass direction is which, or even which instance is
// "Support"/"DPS" a priori — same majority-vote-within-an-instance
// technique GRAVEN_2_SPREAD_MISPLACED already uses: whichever role
// category is the majority among an instance's non-holder victims is
// that instance's "home" side, and anyone in the MINORITY role for that
// instance is the one who stacked with the wrong group. Scoped to only
// the SECOND resolution for now (`collectConfettiResolutions(...)[1]`),
// matching the other two confetti checks' own "only what's confirmed"
// gating.
//
// ── CONFETTI FINAL POSITION (confirmed 2026-07-30, pull 41) ────────────────
//
// The THIRD (final) detonation, right before Tele-Trouncing's arrows
// resolve, is a QUADRANT check rather than an axis or outcome check: per
// the user directly, Support hugs the hitbox northwest of arena center
// with their holder standing a bit further northwest behind them (not
// moving), knocking the other 3 Support players southeast across the
// arena; DPS mirrors it in the southeast quadrant, holder slightly
// further out. Unlike the first resolution's stack-only check, this one
// judges the HOLDER's position too — the holder not moving is as much a
// part of the mechanic as the stack's positioning. `detectConfettiFinal
// PositionMisplacedErrors` reads its holders from `collectResolutions`'s
// LAST group (this detonation is final — it never transfers to a fresh
// pair the way the first two do) and only judges compass bearing for now;
// per the user, precise distance-from-hitbox positioning for this
// resolution isn't tackled yet.
//
// This also required a narrow fix to CONFETTI_LOST above: it originally
// treated ANY death shortly after a Confetti debuff application as "died
// carrying Confetti, mechanic never resolved" — but Azura's death here
// was CAUSED BY the explosion's own damage (killingAbilityGameId ===
// CONFETTI_EXPLOSION_ABILITY_ID), meaning the debuff DID resolve/detonate
// normally, just fatally due to being undermanned. That's a different
// failure shape (already fully covered by GRAVEN_2_DEATH_WIPE, which
// fires on any death during Graven 2 regardless of cause) — CONFETTI_LOST
// now excludes deaths whose killing blow was the explosion itself, so it
// no longer fires a second, redundant "pull is over" cutoff on top of
// GRAVEN_2_DEATH_WIPE for the exact same death.
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
import { distanceBetween, distanceFromCenter, ARENA_CENTER, compassBearingOf, angularDistance } from "@/lib/mechanics/geometry";
import { interpolatePlayerPosition } from "@/lib/mechanics/player-position";
import { detectFFRoles, type FFRoleSlot } from "@/lib/mechanics/ffxiv/roles";

export const BLIZZARD_III_SILENT_KILL_RULE_ID = "ffxiv-phase1-blizzard3-silent-kill";
export const JUMPED_OFF_ARENA_RULE_ID          = "ffxiv-phase1-jumped-off-arena";
export const WAVE_CANNON_TOWER_OVERLAP_RULE_ID   = "ffxiv-phase1-wave-cannon-tower-overlap";
export const WAVE_CANNON_TOWER_MISSED_RULE_ID    = "ffxiv-phase1-wave-cannon-tower-missed";
export const WAVE_CANNON_TOWER_PRIORITY_RULE_ID  = "ffxiv-phase1-wave-cannon-tower-priority-missed";
export const UNMITIGATED_EXPLOSION_WIPE_RULE_ID  = "ffxiv-phase1-unmitigated-explosion-wipe";
export const GRAVITATIONAL_EXPLOSION_WIPE_RULE_ID = "ffxiv-phase1-gravitational-explosion-wipe";
export const GRAVEN_2_SPREAD_MISPLACED_RULE_ID = "ffxiv-phase1-graven2-spread-misplaced";
export const GRAVEN_2_PUDDLE_PROXIMITY_RULE_ID = "ffxiv-phase1-graven2-puddle-proximity";
export const GRAVEN_2_DEATH_WIPE_RULE_ID = "ffxiv-phase1-graven2-death-wipe";
export const TELE_TROUNCING_ARROW_RULE_ID = "ffxiv-phase1-tele-trouncing-arrow-misplaced";
export const TELE_TROUNCING_DEATH_WIPE_RULE_ID = "ffxiv-phase1-tele-trouncing-death-wipe";
export const GRAVEN_1_DEATH_WIPE_RULE_ID = "ffxiv-phase1-graven-1-death-wipe";
export const REVOLTING_RUIN_THREAT_LOSS_RULE_ID = "ffxiv-phase1-revolting-ruin-threat-loss";
export const REVOLTING_RUIN_NON_TANK_DEATH_RULE_ID = "ffxiv-phase1-revolting-ruin-non-tank-death";
export const REVOLTING_RUIN_OUT_OF_POSITION_RULE_ID = "ffxiv-phase1-revolting-ruin-out-of-position";
export const CONFETTI_LOST_RULE_ID = "ffxiv-phase1-confetti-lost";
export const CONFETTI_KNOCKBACK_VICTIM_RULE_ID = "ffxiv-phase1-confetti-knockback-victim-misplaced";
export const CONFETTI_HOLDER_MISPLACED_RULE_ID = "ffxiv-phase1-confetti-holder-misplaced";
export const CONFETTI_GROUP_MISPLACED_RULE_ID = "ffxiv-phase1-confetti-group-misplaced";
export const CONFETTI_FINAL_POSITION_MISPLACED_RULE_ID = "ffxiv-phase1-confetti-final-position-misplaced";

const BLIZZARD_III_BLOWOUT_ABILITY_IDS = new Set([47765, 47768, 47771, 47774]);
const DAMAGE_DOWN_ABILITY_ID = 1002911;

const REVOLTING_RUIN_FIRST_HIT_ABILITY_ID  = 50179;
const REVOLTING_RUIN_SECOND_HIT_ABILITY_ID = 50401;

// Splits hit-1 events into distinct Revolting Ruin III occurrences — an
// occurrence's own hit-1 -> hit-2 gap is ~3.1-3.3s (confirmed pulls 7, 26);
// two DISTINCT occurrences in the same pull are ~83s+ apart (confirmed pull
// 26: opening pair ~16s, second pair ~99s) — wide margin on both sides.
const REVOLTING_RUIN_OCCURRENCE_GAP_MS = 10_000;

// "Confetti" — this raid's own nickname for the Double-Trouble Trap debuff.
const DOUBLE_TROUBLE_TRAP_BUFF_ID = 1005078;

// Generous gap between the debuff being APPLIED and a death that should
// still count as "died carrying Confetti" — the original, apply-anchored
// check (see CONFETTI_REMOVE_DEATH_RACE_MS below for the OTHER, much
// tighter case this rule also covers).
const CONFETTI_DEATH_WINDOW_MS = 10_000;

// Tight gap between the debuff's own REMOVED event and a death that
// should STILL count as "died carrying Confetti" even though the apply
// was long ago — this is specifically the FFLogs race where the
// removedebuff event fires an instant ahead of the actual killing blow
// that consumes it (confirmed pull 9 and again pull 36: ~2s in both
// cases), NOT a general "recently lost it" allowance — a much longer gap
// (confirmed pull 6: Kade Kansado's debuff legitimately transferred away
// ~6.7s before an unrelated death during the same wipe's death cascade)
// is coincidence, not this race, and must NOT be counted. Deliberately
// much smaller than CONFETTI_DEATH_WINDOW_MS.
const CONFETTI_REMOVE_DEATH_RACE_MS = 3_000;

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
// before/behind it, in each direction — deliberately asymmetric. Confirmed-
// clean overshoots: Archidel Del'archi ~648 / Sayacissa Morsaelth ~652
// (pull 18, ~148-152 over the ring), Kade Kansado ~552 (pull 18, ~52 over
// — the user's own deliberately-ambiguous "could go either way," left
// unflagged either way by this threshold), and Archidel Del'archi AGAIN at
// ~783 (pull 35, ~283 over — confirmed clean by the user directly: "they
// were positioned well and got knocked across the arena properly," despite
// the ORIGINAL 250-tolerance threshold of 750 having wrongly flagged her —
// the original tolerance was calibrated off only the pull-18 samples and
// turned out too tight). Widened to comfortably clear all 4 confirmed-clean
// samples while still sitting well under the confirmed failure (Ayumi Emi
// ~1012, ~512 over, pull 18).
//
// UNDERSHOOT was re-tightened once (2026-07-30, pull 38: Dango ~388 and
// Azura Salus ~382 confirmed clean, floor moved to 377) against what was
// then believed to be a confirmed failure at ~372 (Azura Salus, pull 18).
// That pull-18 "failure" was itself OVERTURNED the same day, while
// investigating pull 48: Archidel Del'archi sat at ~257 centiyalms —
// clearly closer to the boss than even the old 372 "failure" — and was
// confirmed clean by the user ("within reasonable limits, got knocked
// across the arena properly"). Re-reviewing pull 18 from the VOD showed
// Azura's resolution actually failed because Salty Dango (the holder)
// stood north instead of west, not because of Azura's own distance —
// so the ~372 sample was never a genuine undershoot failure to begin
// with. With that sample gone, there is currently NO confirmed undershoot
// failure at all (Kade Kansado's ~383 is DPS, already excluded below), so
// the floor is set generously below the lowest confirmed-clean sample
// (Archidel ~257) rather than hugging it — this check now only exists to
// catch someone genuinely standing on top of the boss, not to split hairs
// on a few dozen centiyalms.
const CONFETTI_STACK_OVERSHOOT_TOLERANCE_CENTIYALMS  = 400;
const CONFETTI_STACK_UNDERSHOOT_TOLERANCE_CENTIYALMS = 350;

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

// The THIRD (final) Confetti detonation, right before Tele-Trouncing's
// arrows resolve — see CONFETTI FINAL POSITION module comment. Unlike the
// first resolution's due-west/due-east axis, this one is a compass
// QUADRANT: Support hugs the hitbox northwest of center with their holder
// slightly further northwest behind them, DPS mirrors it southeast.
// Confirmed 2026-07-30, pull 41 (compass bearings from center, 0=N/90=E/
// 180=S/270=W): clean stack — Chauzey Solstice 140°, Sonder Dreams 135°,
// Kade Kansado 144° (all DPS, expected 135°), Archidel Del'archi 307°,
// Azura Salus 288° (both Support, expected 315°, the widest confirmed-
// clean miss at 27° off). Confirmed WRONG (the 3 the user named from the
// VOD): Salty Dango (Support HOLDER) 58° (103° off — nowhere near NW, this
// pull's holder never even reached the correct half of the arena),
// Sayacissa Morsaelth (Support stack) 29° (74° off, also sitting only
// ~200 centi-yalms from center — well inside the hitbox ring itself, not
// just the wrong bearing), Ayumi Emi (DPS HOLDER) 213° (78° off — SW
// instead of SE). Tolerance sits comfortably between the widest confirmed-
// clean miss (27°) and the narrowest confirmed failure (74°).
const CONFETTI_FINAL_SUPPORT_BEARING_DEG = 315; // northwest
const CONFETTI_FINAL_DPS_BEARING_DEG     = 135; // southeast
const CONFETTI_FINAL_QUADRANT_TOLERANCE_DEG = 45;

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

// Mystery Magic's own begincast/cast (there can be more than one per pull —
// confirmed pull 26 has two, only the first one's death is unresolvable —
// see module comment above). GRAVEN_1_DEATH_WIPE_RULE_ID uses this directly
// rather than the Graven Image cast (48370) that usually precedes it, since
// a pull can have a second Mystery Magic with no Graven Image cast of its
// own in between.
const MYSTERY_MAGIC_CAST_ABILITY_ID = 47764;

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

// Graven 2's own wipe condition (confirmed 2026-07-30, report
// Q3GzJNZg64k1hLRm pull 29) — see GRAVITATIONAL_EXPLOSION_WIPE_RULE_ID
// module comment near detectGravitationalExplosionWipeError below.
const GRAVITATIONAL_EXPLOSION_ABILITY_ID = 47789;

// Graven 2's own opening cast (the Gravitas Puddles stack) — marks the
// mechanic's start for GRAVEN_2_DEATH_WIPE_RULE_ID's gate below.
const GRAVEN_2_START_ABILITY_ID = 47788;

// Graven 2's Spread resolution — see GRAVEN_2_SPREAD_MISPLACED_RULE_ID
// module comment near detectGraven2SpreadMisplacedErrors below.
const VITROPHYRE_ABILITY_ID = 47792;

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

// Tele-Trouncing's RESOLUTION step (arrows already placed, now the raid
// gets tethered offscreen to a statue and split into 2 tagged groups —
// see module header) — killing blow ability for the "AoE that kills
// anyone near you, followed by Sleep" side. Confirmed pull 41: 47797
// (Indulgent Will) tags the OTHER 4 players, the ones who go on to get
// Confused (1001283) and threaten a 1-shot melee kill on whoever they
// reach; 47798 (Idyllic Will) tags the 4 who take the AoE hit, and its
// OWN damage is what killed all 4 of them in this pull (they were
// clustered together, so each one's own AoE caught the others too — not
// just one death, a chain).
const TELE_TROUNCING_WILL_ABILITY_ID = 47798;

// Same clustering window as MYSTERY_MAGIC_VOLLEY_CLUSTER_MS — this pull's
// own 4 simultaneous deaths landed within 45ms of each other, comfortably
// inside it.
const TELE_TROUNCING_DEATH_CLUSTER_MS = 3000;

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

type RevoltingRuinOccurrence = {
  start:             number;
  end:               number; // exclusive — next occurrence's start, or Infinity
  mtName:            string | null; // null when hit 1 was ambiguous (already scrambled)
  hit1Targets:       Set<string>;
  hit1Time:          number | null; // null when hit 1 was ambiguous (mtName also null in that case)
  hit2Targets:        Set<string>;
  hit2Time:           number | null; // null when hit 2 never resolved this occurrence
  mtDiedBeforeHit2:   boolean;
  clean:              boolean; // MT (still alive) tanked both hits — the fully successful shape
};

/**
 * Splits Revolting Ruin III's hit-1/hit-2 events into distinct occurrences
 * (a pull can have more than one — see module header) and resolves each
 * one's own outcome independently, shared by both detection functions
 * below so they agree on what "clean" means for a given occurrence.
 */
function resolveRevoltingRuinOccurrences(players: PlayerInfo[], deathEvents: DeathEvent[]): RevoltingRuinOccurrence[] {
  type Hit = { timestamp: number; player: string };
  const hit1Events: Hit[] = [];
  const hit2Events: Hit[] = [];
  for (const player of players) {
    for (const e of player.damageTaken) {
      if (e.abilityId === REVOLTING_RUIN_FIRST_HIT_ABILITY_ID) hit1Events.push({ timestamp: e.timestamp, player: player.name });
      else if (e.abilityId === REVOLTING_RUIN_SECOND_HIT_ABILITY_ID) hit2Events.push({ timestamp: e.timestamp, player: player.name });
    }
  }
  if (hit1Events.length === 0) return [];
  hit1Events.sort((a, b) => a.timestamp - b.timestamp);

  // Split hit-1 events into distinct occurrences by proximity — see module
  // header. Each occurrence is judged independently instead of pooling
  // every occurrence's targets into one check (the bug that hid pull 26's
  // real failure behind an earlier CLEAN occurrence).
  const occurrenceStarts: number[] = [];
  for (const h of hit1Events) {
    if (occurrenceStarts.length === 0 || h.timestamp - occurrenceStarts[occurrenceStarts.length - 1] > REVOLTING_RUIN_OCCURRENCE_GAP_MS) {
      occurrenceStarts.push(h.timestamp);
    }
  }

  return occurrenceStarts.map((start, i) => {
    const nextStart = occurrenceStarts[i + 1] ?? Infinity;

    const thisHit1 = hit1Events.filter((h) => h.timestamp >= start && h.timestamp < nextStart && h.timestamp < start + REVOLTING_RUIN_OCCURRENCE_GAP_MS);
    const hit1Targets = new Set(thisHit1.map((h) => h.player));
    const mtName = hit1Targets.size === 1 ? [...hit1Targets][0] : null;
    const hit1Time = thisHit1.length > 0 ? Math.min(...thisHit1.map((h) => h.timestamp)) : null;

    const thisHit2 = hit2Events.filter((h) => h.timestamp >= start && h.timestamp < nextStart);
    const hit2Targets = new Set(thisHit2.map((h) => h.player));
    const hit2Time = thisHit2.length > 0 ? Math.min(...thisHit2.map((h) => h.timestamp)) : null;

    const mtDiedBeforeHit2 = mtName !== null && hit2Time !== null &&
      deathEvents.some((d) => d.player === mtName && d.timestamp >= start && d.timestamp <= hit2Time);

    // Clean = the MT (still alive) tanked both hits. A dead MT can't be
    // credited with "tanking" hit 2 even if their damageTaken record still
    // shows an earlier occurrence's hit landing on them (only relevant if
    // this occurrence itself somehow reused their name, which shouldn't
    // happen given the per-occurrence windowing above, but the explicit
    // alive check keeps the definition airtight either way).
    const clean = mtName !== null && hit2Targets.has(mtName) && !mtDiedBeforeHit2;

    return { start, end: nextStart, mtName, hit1Targets, hit1Time, hit2Targets, hit2Time, mtDiedBeforeHit2, clean };
  });
}

/**
 * Detects the OT failing to hold enmity through Revolting Ruin III's
 * second hit — see module header for the mechanic and why this is a pure
 * outcome check (hit 2 landed on someone other than hit 1's tank) rather
 * than a stance-buff check.
 */
function detectRevoltingRuinThreatLossErrors(players: PlayerInfo[], deathEvents: DeathEvent[]): PullError[] {
  const tanks = players.filter((p) => p.role === "Tank");
  if (tanks.length !== 2) return []; // needs the standard 2-tank comp to reason about MT/OT

  const errors: PullError[] = [];
  for (const occ of resolveRevoltingRuinOccurrences(players, deathEvents)) {
    if (occ.mtName === null || occ.hit2Time === null || occ.clean) continue;

    // The MT dying to hit 1 itself (a mitigation issue, not a threat issue)
    // means hit 2 landing elsewhere is FALLOUT of that death, not the OT's
    // threat failure — per the README's "death fallout is never flagged"
    // rule. Confirmed 2026-07-30, report Q3GzJNZg64k1hLRm pull 26: this
    // raid's early-progression strategy actually has the MT (Salty Dango)
    // tank BOTH hits, with the OT (Sayacissa Morsaelth) provoking only as a
    // backup in case the MT doesn't survive hit 1 — she was NOT at fault
    // that pull; Dango simply died to hit 1 outright (a mitigation issue),
    // which is already covered by the separate raid-wide non-tank-death
    // rule below. An earlier version of this rule didn't check whether the
    // MT was even alive by hit 2 and misattributed this to the OT.
    if (occ.mtDiedBeforeHit2) continue;

    const mt = tanks.find((t) => t.name === occ.mtName);
    const ot = tanks.find((t) => t.name !== occ.mtName);
    if (!mt || !ot) continue; // hit 1 didn't land on either tank at all — not this mechanic's usual shape

    errors.push({
      ruleId:      REVOLTING_RUIN_THREAT_LOSS_RULE_ID,
      severity:    "Major",
      name:        "Revolting Ruin III Threat Lost",
      description: `Failed to hold enmity after provoking Revolting Ruin III — the second hit landed on ${[...occ.hit2Targets].join(" and ")} instead of ${mt.name} (${mt.className}) tanking both.`,
      timestamp:   occ.hit2Time,
      player:      ot.name,
      class:       ot.className,
      specId:      ot.specId,
      role:        ot.role,
      abilityId:   REVOLTING_RUIN_SECOND_HIT_ABILITY_ID,
      abilityName: "Revolting Ruin III",
    });
  }
  return errors;
}

/**
 * A non-tank dying to either Revolting Ruin III hit during a NON-CLEAN
 * occurrence (the MT didn't tank both hits — see resolveRevoltingRuinOccurrences)
 * means the tankbuster resolved onto an unmitigated player — lethal
 * raid-wide, not survivable the way a mitigated tank surviving it is
 * (confirmed pull 26: 6 non-tanks died simultaneously to hit 2 once the MT
 * died to hit 1). Deliberately scoped to non-clean occurrences only —
 * confirmed pull 29: hit 2 correctly landed on the (surviving) MT AND
 * splashed a nearby non-tank who died anyway (same shape as pull 7's
 * Archidel splash) — per the user this is a fully successful execution of
 * the mechanic with zero errors, so an incidental splash death during an
 * otherwise-clean occurrence must NOT trigger this raid cutoff. Raid-
 * severity, same shape as GRAVEN_1_DEATH_WIPE_RULE_ID — see module header.
 */
function detectRevoltingRuinNonTankDeathError(
  players:           PlayerInfo[],
  deathEvents:       DeathEvent[],
  otherPhase1Errors: PullError[]
): PullError[] {
  const nonCleanWindows = resolveRevoltingRuinOccurrences(players, deathEvents).filter((occ) => !occ.clean);
  if (nonCleanWindows.length === 0) return [];

  const nonTankDeaths = deathEvents.filter(
    (d) => d.role !== "Tank" &&
      (d.killingAbilityGameId === REVOLTING_RUIN_FIRST_HIT_ABILITY_ID || d.killingAbilityGameId === REVOLTING_RUIN_SECOND_HIT_ABILITY_ID) &&
      nonCleanWindows.some((occ) => d.timestamp >= occ.start && d.timestamp < occ.end)
  );
  if (nonTankDeaths.length === 0) return [];

  const firstDeathTime = Math.min(...nonTankDeaths.map((d) => d.timestamp));
  const clusterEnd = firstDeathTime + REVOLTING_RUIN_OCCURRENCE_GAP_MS;

  const clusterDeaths = nonTankDeaths.filter((d) => d.timestamp <= clusterEnd);
  const clusterMajors = otherPhase1Errors.filter(
    (e) => e.severity === "Major" && e.timestamp >= firstDeathTime - REVOLTING_RUIN_OCCURRENCE_GAP_MS && e.timestamp <= clusterEnd
  );

  const cutoff = Math.max(
    ...clusterDeaths.map((d) => d.timestamp),
    ...clusterMajors.map((e) => e.timestamp)
  );

  const victims = [...new Set(clusterDeaths.map((d) => d.player))];

  return [
    {
      ruleId:      REVOLTING_RUIN_NON_TANK_DEATH_RULE_ID,
      severity:    "Raid",
      name:        "Revolting Ruin III Non-Tank Death",
      description: `${victims.join(" and ")} — a non-tank — died to Revolting Ruin III's tankbuster, meaning the wrong player was holding aggro when it resolved. Unresolvable from here; treated as a cutoff point for further per-player analysis this pull.`,
      timestamp:   cutoff + 1,
      abilityId:   REVOLTING_RUIN_SECOND_HIT_ABILITY_ID,
      abilityName: "Revolting Ruin III",
    },
  ];
}

/**
 * Detects a non-tank player actually HIT by either of Revolting Ruin III's
 * cone hits — see module header. Deliberately an OUTCOME check (did the
 * cone actually catch them), not a position/geometry check — confirmed
 * 2026-07-30, per the user, after a position-based version (flagging
 * anyone found north of arena center) produced a false-positive pattern on
 * a DIFFERENT report/team's melee DPS (G7kTFVxjcAC6p1MN: Sayacissa
 * Morsaelth, a Dragoon, consistently measured slightly north almost every
 * pull without ever actually being hit): melee routinely drift north of
 * center chasing positionals, which is fine as long as they stay outside
 * the cone's actual radius — only getting hit is the real mistake. Exempts
 * tanks (either one may legitimately eat the hit, see the threat-loss rule
 * above) — everyone else who appears in hit 1 or hit 2's own target set is
 * flagged, using the game's own outcome as ground truth instead of
 * modeling the cone's geometry.
 *
 * Scoped to CLEAN occurrences only (the tank legitimately tanked hit 2) —
 * a non-clean occurrence's mass hit-2 splash (confirmed several pulls:
 * everyone except the dead MT catching it simultaneously) is fallout of
 * the SAME already-flagged threat/mitigation failure
 * (REVOLTING_RUIN_THREAT_LOSS_RULE_ID / REVOLTING_RUIN_NON_TANK_DEATH_RULE_ID),
 * not each victim's own independent positioning mistake — flagging all of
 * them here too would be the "death fallout is never flagged" trap again,
 * just with more names on it.
 */
function detectRevoltingRuinOutOfPositionErrors(players: PlayerInfo[], deathEvents: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];
  const playerByName = new Map(players.map((p) => [p.name, p]));

  for (const occ of resolveRevoltingRuinOccurrences(players, deathEvents)) {
    if (!occ.clean) continue;

    const hitTargets: { name: string; timestamp: number }[] = [
      ...(occ.hit1Time !== null ? [...occ.hit1Targets].map((name) => ({ name, timestamp: occ.hit1Time! })) : []),
      ...(occ.hit2Time !== null ? [...occ.hit2Targets].map((name) => ({ name, timestamp: occ.hit2Time! })) : []),
    ];

    const flagged = new Set<string>(); // one error per player per occurrence, even if hit by both
    for (const { name, timestamp } of hitTargets) {
      if (flagged.has(name)) continue;
      const player = playerByName.get(name);
      if (!player || player.role === "Tank") continue; // either tank may legitimately eat the hit
      flagged.add(name);

      errors.push({
        ruleId:      REVOLTING_RUIN_OUT_OF_POSITION_RULE_ID,
        severity:    "Major",
        name:        "Revolting Ruin III Out Of Position",
        description: "Was caught by Revolting Ruin III's cone — only a tank should ever be hit by it; everyone else needs to stay clear.",
        timestamp,
        player:      player.name,
        class:       player.className,
        specId:      player.specId,
        role:        player.role,
        abilityId:   REVOLTING_RUIN_SECOND_HIT_ABILITY_ID,
        abilityName: "Revolting Ruin III",
      });
    }
  }
  return errors;
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
      description: `${jump.player} jumped off the arena, signaling the raid is calling this pull — treated as a cutoff point for further per-player analysis.`,
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
 *
 * Per the user directly (2026-07-30, pull 39): this priority order is only
 * meant to be CHECKED when something actually goes wrong — a tower goes
 * unsoaked (this rule) or someone dies to one. Two stack players regularly
 * end up in each other's tower with no consequence at all (confirmed:
 * Chauzey Solstice and Ayumi Emi swap spots often) — this is already
 * naturally handled by the `coveredSlots.size >= openTowers.length` early
 * return just below: if every tower on this side ends up soaked by
 * SOMEONE, the swap is invisible and correctly never flagged, priority
 * order only matters once a tower is left short.
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
  //
  // Soaks are grouped by the TOWER's own sourceInstance FIRST, then matched
  // to a carrier as a group, rather than matching each soaker's position
  // independently — confirmed 2026-07-30, pull 39: Ayumi Emi stood in the
  // M2 tower (same sourceInstance as Chauzey Solstice's confirmed-correct
  // M2 soak) but immediately moved toward M1 right as the hit landed, so
  // HER OWN recorded x/y read closer to M1's carrier than M2's — matched
  // solo, that flipped her attribution to M1 and made both towers look
  // covered. Two soaks sharing a sourceInstance are, definitionally, the
  // same tower, so the group is matched as a whole (summed distance to
  // each candidate carrier) — Chauzey's own unambiguous M2 position pulls
  // the group's total toward M2, correctly overriding Ayumi's drifted
  // sample instead of letting it vote on its own.
  const towerHitsByInstance = new Map<number, { player: PlayerInfo; x: number; y: number }[]>();
  const towerHitsNoInstance: { player: PlayerInfo; x: number; y: number }[] = [];
  for (const player of players) {
    for (const e of player.damageTaken) {
      if (e.abilityId !== WAVE_CANNON_TOWER_ABILITY_ID || e.x === undefined || e.y === undefined) continue;
      const hit = { player, x: e.x, y: e.y };
      if (e.sourceInstance === undefined) { towerHitsNoInstance.push(hit); continue; }
      const list = towerHitsByInstance.get(e.sourceInstance);
      if (list) list.push(hit); else towerHitsByInstance.set(e.sourceInstance, [hit]);
    }
  }

  // Nearest carrier is resolved against ALL 4 carriers, both sides (not
  // just this side's 2) — same as before — so a group that's really on
  // the OTHER side lands on its real carrier and correctly returns null
  // here (filtered out below) instead of being forced onto the
  // nearer-of-only-this-side's-2 option.
  const nearestCarrierSlot = (members: { x: number; y: number }[]): FFRoleSlot | null => {
    let best: { player: PlayerInfo; total: number } | null = null;
    for (const h of waveCannonHits) {
      if (h.x === undefined || h.y === undefined) continue;
      const total = members.reduce((sum, m) => sum + Math.hypot(m.x - h.x!, m.y - h.y!), 0);
      if (!best || total < best.total) best = { player: h.player, total };
    }
    return best ? slotByName.get(best.player.name) ?? null : null;
  };

  const soakedTowerSlotsByName = new Map<string, Set<FFRoleSlot>>();
  const addSoak = (playerName: string, slot: FFRoleSlot) => {
    const set = soakedTowerSlotsByName.get(playerName) ?? new Set<FFRoleSlot>();
    set.add(slot);
    soakedTowerSlotsByName.set(playerName, set);
  };
  for (const members of towerHitsByInstance.values()) {
    const slot = nearestCarrierSlot(members);
    if (!slot) continue; // nearest carrier was on the OTHER side
    for (const m of members) addSoak(m.player.name, slot);
  }
  for (const hit of towerHitsNoInstance) {
    const slot = nearestCarrierSlot([hit]);
    if (slot) addSoak(hit.player.name, slot);
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
      description: "A Wave Cannon tower went unsoaked, triggering Unmitigated Explosion — unresolvable from here; treated as a cutoff point for further per-player analysis this pull.",
      timestamp,
      abilityId:   UNMITIGATED_EXPLOSION_ABILITY_ID,
      abilityName: "Unmitigated Explosion",
    },
  ];
}

/**
 * Graven 2's own wipe condition (confirmed 2026-07-30, report
 * Q3GzJNZg64k1hLRm pull 29): during either Spread step, a player required
 * to spread away from the others can stand too close to a lingering
 * Gravitas puddle, detonating a Gravitational Explosion (47789) that
 * one-shots the entire raid (confirmed: all 7 remaining players died
 * within ~270ms of each other). Per the user, per-player attribution for
 * WHO caused it isn't reliably derivable yet — this is a pure Raid-severity
 * cutoff marker for now, same shape as UNMITIGATED_EXPLOSION_WIPE_RULE_ID
 * immediately above (timestamped at the earliest cast, before any Damage
 * Down applications a survivor might pick up from the same mechanic, so
 * lib/report-data.ts's cutoff drops those as fallout instead of counting
 * them as fresh mistakes).
 */
function detectGravitationalExplosionWipeError(enemyCasts: EnemyEvent[]): PullError[] {
  const casts = enemyCasts.filter((e) => e.abilityId === GRAVITATIONAL_EXPLOSION_ABILITY_ID);
  if (casts.length === 0) return [];

  const timestamp = Math.min(...casts.map((e) => e.timestamp));

  return [
    {
      ruleId:      GRAVITATIONAL_EXPLOSION_WIPE_RULE_ID,
      severity:    "Raid",
      name:        "Gravitational Explosion Wipe",
      description: "Someone required to spread stood too close to a Gravitas puddle, detonating a Gravitational Explosion — unresolvable from here; treated as a cutoff point for further per-player analysis this pull.",
      timestamp,
      abilityId:   GRAVITATIONAL_EXPLOSION_ABILITY_ID,
      abilityName: "Gravitational Explosion",
    },
  ];
}

// A Vitrophyre resolution's own hits land within ~100ms of each other
// (confirmed pull 31: all 5 hits at t=92687); two DISTINCT resolutions in
// the same pull (1st/2nd Spreads) are ~15-20s apart — wide margin.
const GRAVEN_2_SPREAD_RESOLUTION_GAP_MS = 5000;

/**
 * Detects a spreading-role player (Support or DPS, whichever role category
 * is spreading this resolution — see module header) whose own Vitrophyre
 * explosion instance also caught someone else, meaning they didn't stand
 * far enough apart. Pure outcome/overlap check — see module header for why
 * this doesn't need the still-unconfirmed exact spread positions.
 */
function detectGraven2SpreadMisplacedErrors(players: PlayerInfo[]): PullError[] {
  type Hit = { player: PlayerInfo; timestamp: number; sourceInstance: number | undefined };
  const hits: Hit[] = [];
  for (const player of players) {
    for (const e of player.damageTaken) {
      if (e.abilityId === VITROPHYRE_ABILITY_ID) hits.push({ player, timestamp: e.timestamp, sourceInstance: e.sourceInstance });
    }
  }
  if (hits.length === 0) return [];

  const resolutionStarts: number[] = [];
  for (const t of [...new Set(hits.map((h) => h.timestamp))].sort((a, b) => a - b)) {
    if (resolutionStarts.length === 0 || t - resolutionStarts[resolutionStarts.length - 1] > GRAVEN_2_SPREAD_RESOLUTION_GAP_MS) {
      resolutionStarts.push(t);
    }
  }

  const errors: PullError[] = [];
  for (let i = 0; i < resolutionStarts.length; i++) {
    const start = resolutionStarts[i];
    const end = resolutionStarts[i + 1] ?? Infinity;
    const resolutionHits = hits.filter((h) => h.timestamp >= start && h.timestamp < end);

    // Which role category is spreading this resolution — Support (Tank +
    // Healer) or DPS — determined by majority among who actually got hit;
    // the random-per-pull telegraph decides this, same as Graven Image's
    // spread half.
    const supportCount = resolutionHits.filter((h) => h.player.role !== "DPS").length;
    const dpsCount = resolutionHits.length - supportCount;
    const isLegitimateSpreader = supportCount >= dpsCount
      ? (p: PlayerInfo) => p.role !== "DPS"
      : (p: PlayerInfo) => p.role === "DPS";

    const byInstance = new Map<number, Hit[]>();
    for (const h of resolutionHits) {
      if (h.sourceInstance === undefined) continue;
      const list = byInstance.get(h.sourceInstance);
      if (list) list.push(h); else byInstance.set(h.sourceInstance, [h]);
    }

    for (const instanceHits of byInstance.values()) {
      if (instanceHits.length < 2) continue; // clean — hit only themselves

      const legitimateSpreaders = instanceHits.filter((h) => isLegitimateSpreader(h.player));
      if (legitimateSpreaders.length !== 1) continue; // ambiguous (0 or 2+ legitimate spreaders sharing it) — don't guess

      const spreader = legitimateSpreaders[0];
      const victims = instanceHits.filter((h) => h !== spreader).map((h) => h.player.name);

      errors.push({
        ruleId:      GRAVEN_2_SPREAD_MISPLACED_RULE_ID,
        severity:    "Major",
        name:        "Graven 2 Spread Misplaced",
        description: `Did not spread properly during Graven 2 — stood close enough to ${victims.join(" and ")} that their own Vitrophyre explosion clipped them too.`,
        timestamp:   spreader.timestamp,
        player:      spreader.player.name,
        class:       spreader.player.className,
        specId:      spreader.player.specId,
        role:        spreader.player.role,
        abilityId:   VITROPHYRE_ABILITY_ID,
        abilityName: "Vitrophyre",
      });
    }
  }
  return errors;
}

// A single puddle-drop's own 4 apply hits land within ~150ms of each
// other (confirmed pull 51: 107484-107617); two distinct drops (1st/2nd
// stack) are ~18s apart — wide margin, same magnitude as
// GRAVEN_2_SPREAD_RESOLUTION_GAP_MS above.
const GRAVEN_2_PUDDLE_DROP_GAP_MS = 5000;

// Confirmed failure vs. clean, pull 51 — see module header's "GRAVEN 2
// PUDDLE PROXIMITY" section for the full calibration story.
const GRAVEN_2_PUDDLE_PROXIMITY_TOLERANCE_CENTIYALMS = 1180;

/**
 * Detects a Graven 2 spreader who landed too close to a lingering Gravitas
 * puddle from the same stack/spread beat — see module header for the
 * mechanic, the puddle-centroid technique, and why this only fires when
 * GRAVITATIONAL_EXPLOSION_WIPE_RULE_ID actually does this pull.
 */
function detectGraven2PuddleProximityErrors(players: PlayerInfo[], enemyCasts: EnemyEvent[]): PullError[] {
  const explosionCasts = enemyCasts.filter((e) => e.abilityId === GRAVITATIONAL_EXPLOSION_ABILITY_ID);
  if (explosionCasts.length === 0) return [];
  const explosionCastTime = Math.min(...explosionCasts.map((e) => e.timestamp));

  type Hit = { player: PlayerInfo; timestamp: number; x: number; y: number };
  const puddleHits: Hit[] = [];
  const spreadHits: Hit[] = [];
  for (const player of players) {
    for (const e of player.damageTaken) {
      if (e.x === undefined || e.y === undefined) continue;
      if (e.abilityId === GRAVEN_2_START_ABILITY_ID) puddleHits.push({ player, timestamp: e.timestamp, x: e.x, y: e.y });
      if (e.abilityId === VITROPHYRE_ABILITY_ID) spreadHits.push({ player, timestamp: e.timestamp, x: e.x, y: e.y });
    }
  }
  if (puddleHits.length === 0 || spreadHits.length === 0) return [];

  // Puddle drops cluster into groups (1st/2nd stack) — the LAST group is
  // the one the wipe-causing spread resolution follows.
  const dropTimes = [...new Set(puddleHits.map((h) => h.timestamp))].sort((a, b) => a - b);
  let lastDropGroupStart = dropTimes[0];
  for (let i = 1; i < dropTimes.length; i++) {
    if (dropTimes[i] - dropTimes[i - 1] > GRAVEN_2_PUDDLE_DROP_GAP_MS) lastDropGroupStart = dropTimes[i];
  }
  const lastDrop = puddleHits.filter((h) => h.timestamp >= lastDropGroupStart);

  // One position per player — both of a player's puddle-apply hits share
  // the same spot (see module header on the doubled instances).
  const dropPosByPlayer = new Map<string, Hit>();
  for (const h of lastDrop) if (!dropPosByPlayer.has(h.player.name)) dropPosByPlayer.set(h.player.name, h);

  // The 2 puddles sit on opposite sides of arena center, one per light
  // party — same north/south split graven-image.ts's layout learner uses.
  const centroid = (hits: Hit[]): { x: number; y: number } | null =>
    hits.length === 0 ? null : { x: hits.reduce((s, h) => s + h.x, 0) / hits.length, y: hits.reduce((s, h) => s + h.y, 0) / hits.length };
  const grouped = [...dropPosByPlayer.values()];
  const puddles = [
    centroid(grouped.filter((h) => h.y < ARENA_CENTER)),
    centroid(grouped.filter((h) => h.y >= ARENA_CENTER)),
  ].filter((p): p is { x: number; y: number } => p !== null);
  if (puddles.length === 0) return [];

  // The spread resolution that immediately follows the last puddle drop.
  const spreadAfterDrop = spreadHits.filter((h) => h.timestamp >= lastDropGroupStart).sort((a, b) => a.timestamp - b.timestamp);
  if (spreadAfterDrop.length === 0) return [];
  const spreadStart = spreadAfterDrop[0].timestamp;
  const spreadResolutionHits = spreadHits.filter((h) => Math.abs(h.timestamp - spreadStart) < GRAVEN_2_SPREAD_RESOLUTION_GAP_MS);

  // One position per player — a spreader can take 2 near-simultaneous
  // Vitrophyre hits (same doubled-instance shape the puddle applies have).
  const spreaderByPlayer = new Map<string, Hit>();
  for (const h of spreadResolutionHits) if (!spreaderByPlayer.has(h.player.name)) spreaderByPlayer.set(h.player.name, h);

  const errors: PullError[] = [];
  for (const spreader of spreaderByPlayer.values()) {
    const nearest = Math.min(...puddles.map((p) => distanceBetween({ x: spreader.x, y: spreader.y }, p)));
    if (nearest >= GRAVEN_2_PUDDLE_PROXIMITY_TOLERANCE_CENTIYALMS) continue;

    errors.push({
      ruleId:      GRAVEN_2_PUDDLE_PROXIMITY_RULE_ID,
      severity:    "Major",
      name:        "Graven 2 Puddle Proximity",
      description: `Spread only ${(nearest / 100).toFixed(1)} yalms from a lingering Gravitas puddle — too close, triggering the Gravitational Explosion.`,
      timestamp:   explosionCastTime - 1,
      player:      spreader.player.name,
      class:       spreader.player.className,
      specId:      spreader.player.specId,
      role:        spreader.player.role,
      abilityId:   GRAVITATIONAL_EXPLOSION_ABILITY_ID,
      abilityName: "Gravitational Explosion",
    });
  }
  return errors;
}

// Same magnitude as the other wipe-cutoff rules' own death-clustering
// windows (MYSTERY_MAGIC_VOLLEY_CLUSTER_MS, REVOLTING_RUIN_OCCURRENCE_GAP_MS's
// intra-occurrence use, etc).
const GRAVEN_2_DEATH_CLUSTER_MS = 3000;

// See detectGraven2DeathWipeError's own comment on graven2WindowEnd — the
// gap between an explosion's last recorded damageTaken tick and the death
// event it actually causes (confirmed pull 34: ~1.9-2s).
const CONFETTI_EXPLOSION_DEATH_LAG_MS = 5000;

/**
 * Any death from Graven 2's own Gravitas Puddles cast onward makes the
 * rest of the mechanic — and everything chained after it (the tankbuster,
 * Confetti Knockback, Puddle Soaks) — difficult to impossible to resolve
 * cleanly. See module header. A single Raid error fires right after the
 * first such death, same cutoff shape as every other rule in this file
 * that does this.
 */
function detectGraven2DeathWipeError(
  players:           PlayerInfo[],
  deathEvents:       DeathEvent[],
  enemyCasts:        EnemyEvent[],
  otherPhase1Errors: PullError[]
): PullError[] {
  // Gravitas (47788) is Graven 2's own opening cast, but its ability ID
  // isn't provably unique to Phase 1 (this codebase has hit ID/name reuse
  // across later phases before — see the "Blizzard III" collision noted
  // near BLIZZARD_III_BLOWOUT_ABILITY_IDS) — confirmed the hard way: an
  // unbounded version of this gate matched deaths 6-10+ MINUTES into other
  // reports' pulls (Phase 3+), nowhere near Graven 2. Bound the cast
  // search to PHASE_1_END_MS, same boundary JUMPED_OFF_ARENA_RULE_ID
  // already uses for the same reason.
  const graven2Casts = enemyCasts.filter((e) => e.abilityId === GRAVEN_2_START_ABILITY_ID && e.timestamp <= PHASE_1_END_MS);
  if (graven2Casts.length === 0) return [];
  const graven2Start = Math.min(...graven2Casts.map((e) => e.timestamp));

  // See module header — the window's UPPER edge is the SECOND Confetti
  // resolution's own explosion, not PHASE_1_END_MS. Fails open to
  // PHASE_1_END_MS if that resolution (or its explosion damage) isn't in
  // the log at all, same fail-open posture as the cast-search fallback
  // above.
  const secondResolution = collectConfettiResolutions(players)[1];
  let graven2WindowEnd = PHASE_1_END_MS;
  if (secondResolution && secondResolution.holders.length > 0) {
    const firstWaveTime = secondResolution.holders[0].timestamp;
    const explosionTimestamps = players
      .flatMap((p) => p.damageTaken)
      .filter(
        (e) =>
          e.abilityId === CONFETTI_EXPLOSION_ABILITY_ID &&
          e.timestamp >= firstWaveTime &&
          e.timestamp <= firstWaveTime + CONFETTI_RESOLUTION_GAP_MS
      )
      .map((e) => e.timestamp);
    if (explosionTimestamps.length > 0) {
      // +CONFETTI_EXPLOSION_DEATH_LAG_MS: an instakill from an undermanned
      // explosion (see CONFETTI GROUP MISPLACED / HEADCOUNT REQUIREMENT)
      // is credited to a DEATH event that lands a couple seconds after
      // this explosion's own last recorded non-fatal damageTaken tick —
      // confirmed pull 34: last recorded tick at 120228, but the two
      // resulting deaths land at 122101/122145, ~1.9-2s later. Without
      // this buffer those deaths would be wrongly excluded from Graven 2's
      // own window.
      graven2WindowEnd = Math.max(...explosionTimestamps) + CONFETTI_EXPLOSION_DEATH_LAG_MS;
    }
  }

  const graven2Deaths = deathEvents.filter((d) => d.timestamp >= graven2Start && d.timestamp <= graven2WindowEnd);
  if (graven2Deaths.length === 0) return [];

  const firstDeathTime = Math.min(...graven2Deaths.map((d) => d.timestamp));
  const clusterEnd = firstDeathTime + GRAVEN_2_DEATH_CLUSTER_MS;

  const clusterDeaths = graven2Deaths.filter((d) => d.timestamp <= clusterEnd);
  const clusterMajors = otherPhase1Errors.filter(
    (e) => e.severity === "Major" && e.timestamp >= firstDeathTime - GRAVEN_2_DEATH_CLUSTER_MS && e.timestamp <= clusterEnd
  );

  const cutoff = Math.max(
    ...clusterDeaths.map((d) => d.timestamp),
    ...clusterMajors.map((e) => e.timestamp)
  );

  const victims = [...new Set(clusterDeaths.map((d) => d.player))];

  return [
    {
      ruleId:      GRAVEN_2_DEATH_WIPE_RULE_ID,
      severity:    "Raid",
      name:        "Graven 2 Death",
      description: `${victims.join(" and ")} died during Graven 2 — the mechanic (and everything chained after it) becomes difficult to impossible to resolve from here; treated as a cutoff point for further per-player analysis this pull.`,
      timestamp:   cutoff + 1,
      abilityId:   0,
      abilityName: "Graven 2",
    },
  ];
}

/**
 * A death to the FIRST Graven Image/Mystery Magic resolution (either spread
 * tick flavor, or Blizzard III Blowout — see MYSTERY_MAGIC_DEATH_ABILITY_IDS)
 * leaves Wave Cannon unresolvable (it already self-gates on 4 live carriers)
 * and marks the pull as over. This fires a single Raid error just after the
 * death (and any Major error(s) it produced) purely to serve as the
 * lib/report-data.ts cutoff — see module comment. A death to a LATER Graven
 * Image occurrence in the same pull (Graven 2+) is deliberately excluded —
 * Wave Cannon has already resolved by then, so the raid can rez and continue.
 */
function detectGraven1DeathWipeError(
  deathEvents:       DeathEvent[],
  enemyCasts:        EnemyEvent[],
  otherPhase1Errors: PullError[]
): PullError[] {
  const mysteryMagicDeaths = deathEvents.filter((d) => MYSTERY_MAGIC_DEATH_ABILITY_IDS.has(d.killingAbilityGameId));
  if (mysteryMagicDeaths.length === 0) return [];

  // Mystery Magic's own cast-to-resolution delay varies too widely for a
  // fixed short window (confirmed pull 26: first cast at 38269ms resolves
  // at 39071ms, but Blizzard III Blowout deaths from it land as late as
  // 57167ms — an ~19s span from cast to last death) — so gate on the
  // SECOND Mystery Magic cast directly: any Mystery Magic death before it
  // belongs to the first occurrence, whatever its own resolution timing.
  const mysteryMagicCasts = enemyCasts
    .filter((e) => e.abilityId === MYSTERY_MAGIC_CAST_ABILITY_ID)
    .sort((a, b) => a.timestamp - b.timestamp);
  // No Mystery Magic cast on record at all (shouldn't happen alongside a
  // real Mystery Magic death, but fail open rather than silently dropping
  // one) — fall back to the pre-fix behavior of trusting every such death.
  const graven1WindowEnd = mysteryMagicCasts.length >= 2 ? mysteryMagicCasts[1].timestamp : Infinity;
  const graven1Deaths = mysteryMagicDeaths.filter((d) => d.timestamp < graven1WindowEnd);
  if (graven1Deaths.length === 0) return [];

  const firstDeathTime = Math.min(...graven1Deaths.map((d) => d.timestamp));
  const clusterEnd = firstDeathTime + MYSTERY_MAGIC_VOLLEY_CLUSTER_MS;

  const clusterDeaths = graven1Deaths.filter((d) => d.timestamp <= clusterEnd);
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
      ruleId:      GRAVEN_1_DEATH_WIPE_RULE_ID,
      severity:    "Raid",
      name:        "Graven 1 Wipe",
      description: `${victims.join(" and ")} died during Graven 1's Mystery Magic resolution — Wave Cannon needs all 8 players alive to resolve, so this is treated as a cutoff point for further per-player analysis this pull.`,
      timestamp:   cutoff + 1,
      abilityId:   0,
      abilityName: "Mystery Magic",
    },
  ];
}

/**
 * A player who was HOLDING Double-Trouble Trap ("Confetti") dying makes
 * the mechanic unresolvable — a single Raid error fires once, purely as
 * the lib/report-data.ts cutoff marker. See module header for why this
 * checks whether the debuff was still active (or just barely removed)
 * rather than requiring it to be literally active at the death instant.
 *
 * Deliberately does NOT anchor on how long ago the debuff was APPLIED —
 * confirmed pull 36: Salty Dango picked up the (support-side) debuff at
 * the Graven 2 explosion and held it, unbroken, for ~19.6s before an
 * unrelated Hyperdrive death, well past a short apply-based window. What
 * actually matters is whether the debuff was still theirs right up to the
 * death, not how long they'd had it — checked here as "no REMOVED event
 * for it, or one within CONFETTI_DEATH_WINDOW_MS of the death" (that
 * window covers the known FFLogs quirk, confirmed pull 9 and again here,
 * of the removedebuff firing ~2s ahead of the actual unrelated killing
 * blow).
 *
 * Excludes deaths whose killing blow WAS the Confetti explosion itself
 * (see module header, CONFETTI GROUP MISPLACED / HEADCOUNT REQUIREMENT) —
 * that means the debuff DID detonate, just fatally because it was
 * undermanned, a different failure already covered by
 * GRAVEN_2_DEATH_WIPE. This rule is only for a carrier dying to something
 * ELSE before the explosion ever gets to go off.
 */
function detectConfettiLostError(players: PlayerInfo[], deathEvents: DeathEvent[]): PullError[] {
  const hadConfettiBefore = (playerName: string, atTime: number) => {
    const player = players.find((p) => p.name === playerName);
    if (!player) return false;

    const events = player.debuffs
      .filter((d) => d.abilityId === DOUBLE_TROUBLE_TRAP_BUFF_ID && d.timestamp <= atTime)
      .sort((a, b) => a.timestamp - b.timestamp);

    const lastApplied = [...events].reverse().find((d) => d.debuffStatus === "applied");
    if (!lastApplied) return false;

    // Applied recently enough on its own (the original, narrower check).
    if (atTime - lastApplied.timestamp <= CONFETTI_DEATH_WINDOW_MS) return true;

    // Held longer than that, but ONLY still counts if there's a matching
    // REMOVED event for THIS SAME apply that lands close to the death too
    // (the pull-9/pull-36 quirk: removedebuff fires ~2s ahead of the
    // actual unrelated killing blow). No matching removed event at all
    // (e.g. a long-past resolution that was cleanly resolved, whose
    // removal isn't near this later, unrelated death) must NOT default to
    // "still active" — that wrongly flagged every old, already-resolved
    // holder in the pull the first time this was tried.
    const removedSinceApply = events.find(
      (d) => d.debuffStatus === "removed" && d.timestamp >= lastApplied.timestamp
    );
    return !!removedSinceApply && atTime - removedSinceApply.timestamp <= CONFETTI_REMOVE_DEATH_RACE_MS;
  };

  const confettiDeath = deathEvents
    .filter((d) => d.killingAbilityGameId !== CONFETTI_EXPLOSION_ABILITY_ID)
    .filter((d) => hadConfettiBefore(d.player, d.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp)[0];
  if (!confettiDeath) return [];

  return [
    {
      ruleId:      CONFETTI_LOST_RULE_ID,
      severity:    "Raid",
      name:        "Confetti Lost",
      description: `${confettiDeath.player} died while carrying Double-Trouble Trap ("Confetti") — unresolvable from here; treated as a cutoff point for further per-player analysis this pull.`,
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
 *
 * **The undershoot ("too close") check only applies to Tanks/Healers, not
 * DPS** (confirmed 2026-07-30, report Q3GzJNZg64k1hLRm pull 28: Kade
 * Kansado, DPS, sat at ~383 centi-yalms, yet the user confirmed his
 * positioning was correct — he was cleanly knocked through the boss).
 * DPS-side clean samples span a much wider range than Support's (Kade
 * ~383, Sonder Dreams ~505-509 in a different pull, Chauzey Solstice ~554
 * in the SAME pull as Kade) — DPS naturally sit closer to the boss for
 * their own uptime, so "too close" isn't a meaningful DPS mistake the way
 * it is for Support (who have no such uptime reason to hug the hitbox
 * tighter than the ring). No confirmed DPS undershoot FAILURE sample
 * exists, so rather than guess a DPS-specific floor from zero failure
 * data, the check is skipped for DPS
 * entirely until one surfaces. The overshoot ("too far") check is
 * unaffected — its only confirmed failure (Ayumi Emi ~1012) clears the
 * threshold by a wide, unambiguous margin regardless of role.
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
      const tooNear = player.role !== "DPS" && dist < CONFETTI_HITBOX_RADIUS_CENTIYALMS - CONFETTI_STACK_UNDERSHOOT_TOLERANCE_CENTIYALMS;
      if (!tooFar && !tooNear) continue; // within normal jitter of the hitbox ring

      errors.push({
        ruleId:      CONFETTI_KNOCKBACK_VICTIM_RULE_ID,
        severity:    "Major",
        name:        "Incorrect Confetti Knockback",
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

/**
 * Detects a non-holder Confetti victim who stacked with the WRONG side's
 * group for the SECOND resolution (see module header, CONFETTI GROUP
 * MISPLACED / HEADCOUNT REQUIREMENT) — an outcome/majority-vote check,
 * the same technique `detectGraven2SpreadMisplacedErrors` uses: whichever
 * role category is the majority among an explosion instance's non-holder
 * victims is that instance's "home" side, and anyone in the minority role
 * is the one who stacked wrong. Only the second resolution is confirmed
 * so far — see module header on why the third (Tele-Trouncing) isn't
 * handled yet.
 */
function detectConfettiGroupMisplacedErrors(players: PlayerInfo[]): PullError[] {
  const resolution = collectConfettiResolutions(players)[1];
  if (!resolution || resolution.holders.length === 0) return [];

  const holderNames = new Set(resolution.holders.map((h) => h.player.name));
  const firstWaveTime = resolution.holders[0].timestamp;

  type Hit = { player: PlayerInfo; timestamp: number; sourceInstance: number | undefined };
  const hits: Hit[] = [];
  for (const player of players) {
    if (holderNames.has(player.name)) continue; // holders define a side, they can't be "wrong side"
    for (const e of player.damageTaken) {
      if (
        e.abilityId === CONFETTI_EXPLOSION_ABILITY_ID &&
        e.timestamp >= firstWaveTime &&
        e.timestamp <= firstWaveTime + CONFETTI_RESOLUTION_GAP_MS
      ) {
        hits.push({ player, timestamp: e.timestamp, sourceInstance: e.sourceInstance });
      }
    }
  }
  if (hits.length === 0) return [];

  const byInstance = new Map<number, Hit[]>();
  for (const h of hits) {
    if (h.sourceInstance === undefined) continue;
    const list = byInstance.get(h.sourceInstance);
    if (list) list.push(h); else byInstance.set(h.sourceInstance, [h]);
  }
  if (byInstance.size !== 2) return []; // expects exactly one instance per side — ambiguous otherwise, don't guess

  const errors: PullError[] = [];
  for (const instanceHits of byInstance.values()) {
    const supportCount = instanceHits.filter((h) => SUPPORT_ROLES.has(h.player.role)).length;
    const dpsCount = instanceHits.length - supportCount;
    const isExpectedRole = supportCount >= dpsCount
      ? (p: PlayerInfo) => SUPPORT_ROLES.has(p.role)
      : (p: PlayerInfo) => !SUPPORT_ROLES.has(p.role);

    for (const hit of instanceHits) {
      if (isExpectedRole(hit.player)) continue;

      errors.push({
        ruleId:      CONFETTI_GROUP_MISPLACED_RULE_ID,
        severity:    "Major",
        name:        "Confetti Group Misplaced",
        description: `Stacked with the wrong Confetti group at the second detonation — should have been with the other ${SUPPORT_ROLES.has(hit.player.role) ? "Support" : "DPS"} players. Each side's explosion needs its holder plus 3 others to go off safely; being short of that instantly kills everyone it hits.`,
        timestamp:   hit.timestamp,
        player:      hit.player.name,
        class:       hit.player.className,
        specId:      hit.player.specId,
        role:        hit.player.role,
        abilityId:   CONFETTI_EXPLOSION_ABILITY_ID,
        abilityName: "Confetti Knockback",
      });
    }
  }
  return errors;
}

/**
 * Detects a player (holder OR stack, unlike the first resolution's
 * stack-only check — see module comment) out of position for the THIRD
 * (final) Confetti detonation, right before Tele-Trouncing's arrows
 * resolve. Unlike the first two resolutions, this one never produces a
 * fresh debuff APPLY event of its own — the debuff just detonates on
 * whoever picked it up at the second resolution (Support and DPS each
 * keep their own holder from there through to this final blast) — so its
 * holders are read from `collectConfettiResolutions`'s LAST group instead
 * of a dedicated one, and its own snapshot moment is found as the last
 * Confetti-explosion damage in the pull, after that group's own window.
 */
function detectConfettiFinalPositionMisplacedErrors(players: PlayerInfo[]): PullError[] {
  const resolutions = collectConfettiResolutions(players);
  if (resolutions.length < 2) return []; // no second (Graven 2) resolution to carry a holder into a third at all

  const finalHolders = resolutions[resolutions.length - 1].holders;
  if (finalHolders.length === 0) return [];

  const holderWindowEnd = finalHolders[0].timestamp + CONFETTI_RESOLUTION_GAP_MS;
  const explosionTimestamps = players
    .flatMap((p) => p.damageTaken)
    .filter((e) => e.abilityId === CONFETTI_EXPLOSION_ABILITY_ID && e.timestamp > holderWindowEnd)
    .map((e) => e.timestamp);
  if (explosionTimestamps.length === 0) return []; // final detonation isn't in the log (e.g. a holder died first, see CONFETTI_LOST)

  const snapshotTime = Math.min(...explosionTimestamps) - CONFETTI_SNAPSHOT_LEAD_MS;
  const holderNames = new Set(finalHolders.map((h) => h.player.name));

  const errors: PullError[] = [];
  for (const player of players) {
    const pos = interpolatePlayerPosition(player, snapshotTime, {
      windowMs:        CONFETTI_POSITION_WINDOW_MS,
      healing:         "self",
      damageTaken:     false,
      casts:           "self",
      healingReceived: "any",
    });
    if (!pos) continue; // can't confirm their position — fail closed, don't guess

    const bearing = compassBearingOf(pos.x, pos.y);
    const isSupport = SUPPORT_ROLES.has(player.role);
    const expectedBearing = isSupport ? CONFETTI_FINAL_SUPPORT_BEARING_DEG : CONFETTI_FINAL_DPS_BEARING_DEG;
    const off = angularDistance(bearing, expectedBearing);
    if (off < CONFETTI_FINAL_QUADRANT_TOLERANCE_DEG) continue; // within normal jitter of the expected quadrant

    const expectedDir = isSupport ? "northwest" : "southeast";
    const isHolder = holderNames.has(player.name);
    errors.push({
      ruleId:      CONFETTI_FINAL_POSITION_MISPLACED_RULE_ID,
      severity:    "Major",
      name:        "Confetti Final Position Misplaced",
      description: `Was roughly ${off.toFixed(0)}° off the expected ${expectedDir} quadrant when the final Confetti detonated — should have been ${isHolder ? `standing further ${expectedDir}, behind their own ${isSupport ? "Support" : "DPS"} stack` : `hugging the boss's hitbox ${expectedDir} of center`}.`,
      timestamp:   snapshotTime,
      player:      player.name,
      class:       player.className,
      specId:      player.specId,
      role:        player.role,
      abilityId:   DOUBLE_TROUBLE_TRAP_BUFF_ID,
      abilityName: "Double-Trouble Trap",
    });
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
 * A death to the AoE side's own damage (Idyllic Will) during Tele-
 * Trouncing's resolution — see module header. Per-player attribution for
 * WHO baited wrong isn't built yet (see FIXED BAIT note above), so this is
 * a pure Raid-severity cutoff, same shape as GRAVEN_1_DEATH_WIPE/
 * CONFETTI_LOST — clusters every death in the same near-simultaneous
 * volley into one error rather than firing once per victim.
 */
function detectTeleTrouncingDeathWipeError(deathEvents: DeathEvent[]): PullError[] {
  const willDeaths = deathEvents.filter((d) => d.killingAbilityGameId === TELE_TROUNCING_WILL_ABILITY_ID);
  if (willDeaths.length === 0) return [];

  const firstDeathTime = Math.min(...willDeaths.map((d) => d.timestamp));
  const clusterDeaths = willDeaths.filter((d) => d.timestamp <= firstDeathTime + TELE_TROUNCING_DEATH_CLUSTER_MS);
  const victims = [...new Set(clusterDeaths.map((d) => d.player))];
  const cutoff = Math.max(...clusterDeaths.map((d) => d.timestamp));

  return [
    {
      ruleId:      TELE_TROUNCING_DEATH_WIPE_RULE_ID,
      severity:    "Raid",
      name:        "Tele-Trouncing Wipe",
      description: `${victims.join(" and ")} died before the arrows resolved — unresolvable from here; treated as a cutoff point for further per-player analysis this pull.`,
      timestamp:   cutoff + 1,
      abilityId:   TELE_TROUNCING_WILL_ABILITY_ID,
      abilityName: "Idyllic Will",
    },
  ];
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
  const revoltingRuinThreatLossErrors = detectRevoltingRuinThreatLossErrors(players, deathEvents);
  const graven2SpreadMisplacedErrors = detectGraven2SpreadMisplacedErrors(players);

  return [
    ...revoltingRuinThreatLossErrors,
    ...detectRevoltingRuinNonTankDeathError(players, deathEvents, revoltingRuinThreatLossErrors),
    ...detectRevoltingRuinOutOfPositionErrors(players, deathEvents),
    ...blizzardIIISilentKillErrors,
    ...detectJumpedOffArenaError(players, deathEvents),
    ...detectWaveCannonTowerOverlapErrors(players, deathEvents),
    ...detectWaveCannonTowerMissedErrors(players, deathEvents, enemyCasts),
    ...detectWaveCannonSupportPriorityErrors(players, deathEvents, enemyCasts),
    ...detectWaveCannonDpsPriorityErrors(players, deathEvents, enemyCasts),
    ...detectUnmitigatedExplosionWipeError(enemyCasts),
    ...detectGraven2PuddleProximityErrors(players, enemyCasts),
    ...detectGravitationalExplosionWipeError(enemyCasts),
    ...detectGraven1DeathWipeError(deathEvents, enemyCasts, blizzardIIISilentKillErrors),
    ...graven2SpreadMisplacedErrors,
    ...detectGraven2DeathWipeError(players, deathEvents, enemyCasts, graven2SpreadMisplacedErrors),
    ...detectConfettiLostError(players, deathEvents),
    ...detectConfettiKnockbackVictimErrors(players),
    ...detectConfettiHolderMisplacedErrors(players),
    ...detectConfettiGroupMisplacedErrors(players),
    ...detectConfettiFinalPositionMisplacedErrors(players),
    ...detectTeleTrouncingArrowErrors(players),
    ...detectTeleTrouncingDeathWipeError(deathEvents),
  ].sort((a, b) => a.timestamp - b.timestamp);
}
