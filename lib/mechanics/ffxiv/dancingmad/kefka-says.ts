// lib/mechanics/ffxiv/dancingmad/kefka-says.ts
//
// Phase 4 ("Kefka Says") error detection, plus the implementation notes that
// document how the wtfdig Kefka Says analyzer determines whether the Phase 4
// mechanics and their associated debuffs are real or fake from FFLogs.
//
// Only ONE check is implemented so far - the Flood of Naught side call (see
// detectFloodOfNaughtErrors at the bottom of this file). Everything else in
// these notes is the model a future implementation should build on; the
// per-debuff stack/spread/gaze/acceleration checks are NOT written yet.
//
// -- PRIMARY REAL/FAKE SIGNAL -------------------------------------------------
//
// Do not infer real/fake from player movement, damage, debuff duration, deaths,
// or whether the party resolved the mechanic successfully. The combat log has a
// hidden status that directly encodes the answer:
//
//   abilityGameID 1002056
//   FFLogs/analyzer name: "Unknown_808" (the displayed name may change)
//   relevant event type: "applydebuff"
//   target: Neo Exdeath or Chaos
//   value: event.extraInfo
//
// Decode event.extraInfo by parity:
//
//   extraInfo % 2 === 0  -> real
//   extraInfo % 2 === 1  -> fake
//   missing extraInfo    -> unknown; do not guess
//
// Confirmed examples from report 3MfQX7h29vPV4xYz, fight 18:
//
//   Neo Exdeath: 1121 fake, 1121 fake, 1122 real, 1122 real (Flood)
//   Chaos:        1119 fake (Inferno), 1120 real (Tsunami)
//
// Identify the status target through report master-data actor IDs/names, never
// through a hard-coded actor ID: FFLogs actor IDs differ between reports. Treat
// a target whose actor name contains "Chaos" (case-insensitive) as a Chaos
// signal. The remaining 1002056 boss-targeted signals in this phase belong to
// Neo Exdeath. If actor identity is ambiguous, leave the result unknown.
//
// -- PHASE ANCHOR AND ROUND ASSOCIATION --------------------------------------
//
// Anchor the phase on Kefka's completed cast of Kefka Says:
//
//   49884  Kefka Says
//
// The wtfdig implementation examines approximately 3 seconds before this cast
// through 110 seconds after it for casts/headmarkers, and up to 200 seconds
// after it (clamped to fight end) for debuffs, damage, and deaths.
//
// Grand Cross is:
//
//   47892  Grand Cross
//
// Sort completed Grand Cross cast events by timestamp. Sort the Neo Exdeath
// 1002056 applydebuff events by timestamp. Pair the first Neo signal with Grand
// Cross 1, the second with Grand Cross 2, and the third with Grand Cross 3.
// A fourth Neo signal, when there are more Neo signals than Grand Cross casts,
// is the real/fake value for Flood of Naught.
//
// Chaos casts are:
//
//   47904  Inferno
//   47905  Tsunami
//
// For each completed Inferno/Tsunami cast, use the latest Chaos 1002056 status
// applied at or before castTime + 1 second. The +1 second allowance handles log
// ordering/jitter around the cast. If there is no preceding signal, wtfdig uses
// the closest Chaos signal by absolute timestamp; a safer implementation may
// instead report unknown when the nearest signal is not plausibly close.
//
// Associate each Chaos cast with the Grand Cross round whose completed cast is
// immediately before it and whose next Grand Cross cast is after it.
//
// -- KEFKA'S ICE/LIGHTNING SIGNAL --------------------------------------------
//
// Kefka's elemental real/fake state is encoded by headmarkerID, not by
// ability 1002056:
//
//   675  ice fake
//   676  ice real
//   677  lightning fake
//   678  lightning real
//
// Group relevant headmarker events that occur within 900 ms of one another.
// Each group should contain an ice marker and a lightning marker. Before the
// Mana Charge section, order these groups chronologically and pair them with
// Mystery Magic / Grand Cross rounds 1-3.
//
// The current analyzer separates the opening round markers from the later Mana
// Charge markers using KefkaSaysCastTime + 50 seconds. Markers before that point
// describe rounds 1-3; markers at or after it describe Mana Charge/Release.
// This timing boundary is encounter-specific and should be validated if the log
// format or encounter timeline changes.
//
// -- TURNING NEO EXDEATH'S VALUE INTO PLAYER CALLS ---------------------------
//
// The player debuffs do not carry their own independent real/fake bit. Their
// required behavior is derived from the real/fake value on the Grand Cross that
// applied them.
//
// Relevant player status IDs:
//
//   1005543  Cursed Shriek
//   1005544  Forked Lightning
//   1005545  Compressed Water
//   1005546  Acceleration Bomb
//
// If Neo Exdeath / Grand Cross is FAKE:
//
//   - Compressed Water holders spread; all other players stack.
//   - Acceleration Bomb holders resolve with Motion.
//   - Cursed Shriek resolves by looking at the source.
//
// If Neo Exdeath / Grand Cross is REAL:
//
//   - Forked Lightning holders spread; all other players stack.
//   - Acceleration Bomb holders resolve with Stillness.
//   - Cursed Shriek resolves by looking away from the source.
//
// Use the debuff application timestamp to associate player debuffs with the
// nearest Grand Cross cast. Use application timestamp + duration to obtain the
// expected resolution time. The earliest water/lightning expiration is the
// short set and the latest is the long set; classify Acceleration Bomb the same
// way by comparing its expiration to those two resolution times. Do not rely on
// one exact duration because durations vary between the short and long sets.
//
// For Chaos's calls, wtfdig currently translates:
//
//   Inferno real -> Move
//   Inferno fake -> Stay
//   Tsunami real -> Stay
//   Tsunami fake -> Move
//
// -- MANA CHARGE / MANA RELEASE ---------------------------------------------
//
// Relevant casts:
//
//   47780  Mana Charge
//   47781  Mana Release
//
// For each element, take the first later headmarker as the recorded/charged
// value and the second later headmarker as the release cast's value. The final
// mechanic is REAL when the two values are equal and FAKE when they differ:
//
//   real + real -> real
//   fake + fake -> real
//   real + fake -> fake
//   fake + real -> fake
//
// This is an equality/XNOR rule: the familiar "double fake becomes real" case.
// If either marker is missing (for example, the pull wiped before it appeared),
// leave the result unknown rather than substituting an earlier round marker.
//
// -- FLOOD OF NAUGHT RESULT CHECK (SEPARATE FROM REAL/FAKE DETECTION) --------
//
// The extra Neo Exdeath 1002056 signal determines whether Flood itself is real
// or fake. Player correctness during a real Flood can then be checked with:
//
//   1005541  White Wound
//   1005542  Black Wound
//   1000454  Allagan Field  -> final wound color must swap
//   1001382  Beyond Death   -> final wound color must stay the same
//   50068    White Antilight damage
//   50069    Black Antilight damage
//
// Track each player's initial wound, field instruction, and final wound after
// any color-changing application. A mismatch between expected and final color
// means the player took the wrong side. wtfdig also records the maximum
// calculated damage from each Antilight: under 10,000 is labeled safe,
// 10,000-119,999 mitigated, and 120,000 or more lethal. Taking meaningful
// damage from both colors indicates the player was caught in the middle.
// These thresholds judge Flood execution only; they must never be used to
// decide whether the originating boss mechanic was real or fake.
//
// -- DETERMINING FLOOD OF NAUGHT'S STARTING EDGE -----------------------------
//
// Flood of Naught and its two half-room effects use these ability IDs:
//
//   50066  Flood of Naught
//   50068  White Antilight
//   50069  Black Antilight
//
// Request cast events with includeResources enabled. The completed 50066 cast's
// sourceResources contains Neo Exdeath's position and facing after he teleports
// to the edge. FFLogs stores x/y in hundredths, so divide both by 100. The arena
// center for this phase is (100, 100).
//
// Determine the starting edge from the vector between center and the source:
//
//   dx = sourceResources.x / 100 - 100
//   dy = sourceResources.y / 100 - 100
//
// In FFXIV coordinates, negative y is north, positive x is east, positive y is
// south, and negative x is west. Quantize atan2(dy, dx) to the nearest 45
// degrees to support all eight possible cardinal/intercardinal starting edges.
// Do not hard-code one edge: Neo Exdeath can teleport to a random cardinal or
// intercardinal. If sourceResources is absent, look for the nearest position-
// bearing event from the same source actor/instance; otherwise return unknown.
//
// Facing can be used as a consistency check. The analyzer's FFLogs conversion
// for the raw facing value is:
//
//   radians = (-rawFacing - 150 * PI) / 100
//   direction vector = (sin(radians), cos(radians))
//
// Neo Exdeath should face approximately from his starting edge toward arena
// center. Prefer position for edge classification and use facing to detect bad
// or stale coordinates rather than making facing the only signal.
//
// The completed 50068/50069 casts are emitted by separate Neo Exdeath helper
// instances. Their sourceResources positions identify the two lanes/halves on
// either side of the main Flood source. These are useful for confirming which
// telegraphed half is White versus Black. Keep the displayed color separate
// from the effective color: a fake Flood reverses the colors that actually hit.
//
// Reference case, report 3MfQX7h29vPV4xYz fight 18:
//
//   50066 Flood source:       (80.00, 100.00), raw facing -629
//   offset from center:       (-20.00, 0.00) -> west edge
//   decoded facing:           approximately east, toward center
//   50069 Black Antilight:    (80.00, 90.50) -> west/north lane
//   50068 White Antilight:    (80.00, 109.50) -> west/south lane
//   50066 begin/cast:         pull +799.439s / +804.433s
//   Antilight cast effects:   pull +804.923s
//
// Therefore this pull's Flood starts west and travels east. Because its hidden
// 1002056 signal is even (1122), Flood is real: the north telegraph is actually
// Black and the south telegraph is actually White. The edge/orientation result
// and the real/fake result are independent inputs and should be modeled
// separately before deriving each player's required side.
//
// -- REFERENCE PULL SANITY CHECK ---------------------------------------------
//
// A correct implementation should reproduce the following for report
// 3MfQX7h29vPV4xYz, fight 18:
//
//   round 1: ice fake, lightning real, Neo Exdeath fake, Inferno fake
//   round 2: ice real, lightning fake, Neo Exdeath fake, Tsunami real
//   round 3: ice fake, lightning real, Neo Exdeath real, Flood real
//
// That pull reaches Mana Charge but wipes before the later marker sequence is
// complete, so Mana Charge/Mana Release must remain unknown.
//
// -- FULL MECHANIC MODEL AND INTENDED PLAYER SOLUTION ------------------------
//
// Phase 4 is best understood as a two-part memory mechanic. During the first
// half, Kefka, Neo Exdeath, and Chaos simultaneously write information into a
// ledger: elemental safe spots, personal debuffs, and a real/fake state for
// each mechanic. During the second half, the party resolves that ledger in
// short-then-long order while Kefka records and later replays two attacks.
//
// "Fake" generally does not mean that a mechanic disappears. It means that its
// telegraph, debuff, or required response is inverted. Players must remember
// the state of the cast that created their debuff, because the status icon alone
// does not communicate the final response.
//
// 1. KEFKA SAYS AND THE THREE ASSIGNMENT ROUNDS
//
// Kefka begins the phase in the middle and summons Chaos and Neo Exdeath. The
// party then handles three overlapping rounds:
//
//   - Kefka casts Mystery Magic, showing real/fake ice and lightning attacks.
//   - Neo Exdeath casts Grand Cross and assigns player debuffs.
//   - During the first two rounds, Chaos casts one Inferno and one Tsunami, in
//     either order. Their real/fake states determine how their later debuffs
//     resolve.
//
// Players dodge Kefka's current ice/lightning pattern while recording the
// real/fake state of all three bosses. Kefka's telegraphs are truthful when
// real and inverted when fake.
//
// 2. GRAND CROSS 1 AND 2: PERSONAL DEBUFF LEDGER
//
// The first two Grand Crosses distribute Compressed Water, Forked Lightning,
// Cursed Shriek, and Acceleration Bomb across support and DPS players. They
// create short and long resolution sets. The same player does not receive the
// same assignment twice, so after both casts every player can determine which
// of their assignments is short and which is long.
//
// Interpret each debuff using the state of the Grand Cross that applied it:
//
//                         REAL GRAND CROSS       FAKE GRAND CROSS
//   Compressed Water      stack                  spread
//   Forked Lightning      spread                 stack
//   Cursed Shriek         look away              look at
//   Acceleration Bomb     stillness              motion
//
// "Stillness" means the holder must stop moving and taking actions, including
// auto-attacks, when Acceleration Bomb expires. "Motion" means the holder must
// be moving when it expires.
//
// For water/lightning, the practical result is one spread player in each role
// group and everyone else stacking. A common layout places the support stack
// north and DPS stack south, with the support spread west and DPS spread east.
// Detection should judge the underlying stack/spread requirements rather than
// require these exact compass positions, because groups may use another valid
// strategy.
//
// Cursed Shriek is centered on its holders. On a real Grand Cross everyone
// looks away from the Shriek source(s); on a fake Grand Cross everyone must look
// toward at least one source. The group normally places the holders so all
// players can satisfy the gaze without disrupting the surrounding mechanics.
//
// 3. CHAOS: INFERNO/ENTROPY AND TSUNAMI/DYNAMIC FLUID
//
// Chaos uses both mechanics once, in either order. The cast applies a delayed
// debuff to the party, and the cast's remembered real/fake state determines the
// shape that appears when the debuff expires:
//
//   Inferno -> Entropy
//     real: circle AoEs are baited under players; group first, then move out
//     fake: donut AoEs surround players; stay grouped/in the safe center
//
//   Tsunami -> Dynamic Fluid
//     real: donut AoEs surround players; stay grouped/in the safe center
//     fake: circle AoEs are baited under players; group first, then move out
//
// In compact callout form:
//
//   Inferno real = Move       Inferno fake = Stay
//   Tsunami real = Stay       Tsunami fake = Move
//
// One Chaos debuff belongs to the short resolution block and the other to the
// long block. Which named mechanic is short depends on whether Chaos used
// Inferno or Tsunami first.
//
// 4. GRAND CROSS 3 AND FLOOD OF NAUGHT
//
// The third Grand Cross assigns every player a White Wound or Black Wound and
// either Allagan Field or Beyond Death. Neo Exdeath then moves to an arena edge
// and casts Flood of Naught, producing white and black Antilight half-room
// attacks. Flood also has its own real/fake state: when fake, the displayed side
// colors are reversed.
//
// Conceptually, Allagan Field players must avoid the lethal color and Beyond
// Death players must deliberately take the lethal color. Grand Cross 3 can
// invert the individual debuff meanings, but the wound and Field/Beyond effects
// are always inverted together. This produces a simpler solution that does not
// require separately remembering Grand Cross 3's state:
//
//                         FLOOD REAL             FLOOD FAKE
//   Allagan Field        opposite wound color   same as wound color
//   Beyond Death         same as wound color     opposite wound color
//
// "Color" here means the side as telegraphed by Flood. Because a fake Flood
// swaps which color actually hits each side, the player reverses their normal
// choice when Flood is fake. Players should stay clear of the overlap near the
// middle, where both Antilight attacks can hit.
//
// 5. SHORT RESOLUTION BLOCK AND MANA CHARGE
//
// After Flood, the stored personal mechanics begin resolving. The short block
// proceeds broadly as follows:
//
//   - Short Compressed Water/Forked Lightning and short Acceleration Bomb.
//   - Thrumming Thunder III while the short Cursed Shrieks resolve.
//   - The short Entropy or Dynamic Fluid debuff.
//
// During this block Kefka casts Mana Charge and records the upcoming Thrumming
// Thunder III and Blizzard III Blowout, including whether each was real or fake.
// Players must remember both recorded elemental states for Mana Release.
//
// 6. LONG RESOLUTION BLOCK
//
// The long block follows the same personal rules as the short block:
//
//   - Blizzard III Blowout resolves alongside long water/lightning and long
//     Acceleration Bomb assignments.
//   - Long Cursed Shrieks resolve.
//   - The remaining long Entropy or Dynamic Fluid resolves.
//   - Mana Release replays the charged thunder and ice mechanics.
//
// Each water/lightning, gaze, and acceleration response must still use the
// real/fake state of the particular Grand Cross that originally applied that
// player's debuff; the short and long sets are not globally real or fake.
//
// 7. MANA RELEASE: COMBINING TWO REAL/FAKE STATES
//
// Mana Charge records Kefka's original Thrumming Thunder III and Blizzard III
// Blowout states. Mana Release supplies a second real/fake state for each
// element. Combine the two states independently for lightning and ice:
//
//   recorded real + release real -> final real
//   recorded fake + release fake -> final real
//   recorded real + release fake -> final fake
//   recorded fake + release real -> final fake
//
// Equivalently: matching states are real and different states are fake. Players
// then solve the replayed thunder and ice according to those final states while
// also finishing the long Chaos debuff. This is the phase's "double fake becomes
// real" rule.
//
// 8. PHASE END
//
// After the stored mechanics resolve, Kefka casts Ultima Upsurge. The raid must
// have pushed him below 25% HP to survive/advance into Phase 5; otherwise this
// is the phase enrage.
//
// -- DETECTION DESIGN CONSEQUENCES -------------------------------------------
//
// A future implementation should model this as provenance, not merely as a
// list of status IDs. Every delayed player debuff needs to retain which Grand
// Cross or Chaos cast created it and that cast's decoded real/fake state. The
// evaluator can then derive the required behavior at expiration and compare it
// with movement, facing, positions, damage, or deaths. Preserve "unknown" when
// the originating signal is absent; downstream checks must not accuse a player
// based on a guessed state. Finally, keep strategy-neutral mechanic correctness
// (spread vs stack, move vs stay, correct gaze/color) separate from optional
// checks for one group's preferred positions.

// ═══════════════════════════════════════════════════════════════════════════
// IMPLEMENTATION: FLOOD OF NAUGHT SIDE CALL
// ═══════════════════════════════════════════════════════════════════════════
//
// Confirmed 2026-09-02 against 3MfQX7h29vPV4xYz pull 17 (the one failure the
// user adjudicated), plus 7 clean Flood resolutions across
// Vmbf6WYw3QGcMntx pull 20 and dQ8wmb1VhKt6yBXk pulls 1/2/3/9/11/15 —
// 64 player-resolutions in total, exactly one flagged.
//
// ── Why this check needs NO real/fake input ────────────────────────────────
//
// The notes above derive each player's required side from Flood's decoded
// real/fake bit plus the telegraphed colors. That is the PLAYER's solve — it
// is not what detection needs, because the log records the EFFECTIVE color
// that actually hit each player (a fake Flood swaps which color lands on
// which half, and FFLogs reports the one that landed). So the requirement
// collapses to a pure outcome check against the player's own wound:
//
//   Beyond Death  -> must be hit by the Antilight MATCHING their wound color
//                     (the lethal one; Beyond Death is what lets them live)
//   Allagan Field -> must be hit by the OPPOSITE color (the survivable one)
//
// This is the README's "gate on OUTCOME, not position" rule, and it means
// this check keeps working on captures that predate the enemyDebuffs stream
// (see lib/ffl-client.ts) — no 1002056 signal required.
//
// Detection keys on the color relationship and deliberately never reads the
// damage amounts, which turn out to be no signal at all. Across the 8
// observed Flood resolutions the magnitudes fall into two entirely
// different regimes:
//
//   Beyond Death takes FULL HP, Allagan Field takes 999
//     3MfQX7h29vPV4xYz p17, dQ8wmb1VhKt6yBXk p2 / p3 / p9
//   Beyond Death takes 999, Allagan Field takes 66000
//     Vmbf6WYw3QGcMntx p20, dQ8wmb1VhKt6yBXk p1 / p11 / p15
//
// and the regimes do NOT track Flood's real/fake bit (p17 is real and p2 is
// fake, yet both land in the first group; p20 is real and p11 fake, yet both
// land in the second). An earlier version of this comment claimed the
// matching color always deals full health — that held only in the pull it
// was written from. Anything reading these amounts would be reading noise.
//
// ── The confirmed failure ─────────────────────────────────────────────────
//
// 3MfQX7h29vPV4xYz pull 17, 13:25.10: Sayacissa Morsaelth held Beyond Death
// + Black Wound and needed the Black Antilight. She took White instead. Two
// observable consequences, both present in the log:
//   - her wound SWAPPED B->W, the transition an Allagan Field player makes,
//     instead of being consumed along with Beyond Death, and
//   - Beyond Death was never removed at the hit; it expired unresolved 2.5s
//     later at 13:27.69 and killed her (that death carries no killing
//     ability id at all, so no killingBlow rule can ever catch this).
// Detection anchors on the Antilight hit rather than either consequence —
// the wound swap and the death are both downstream of the same mistake, and
// the hit is the moment the player actually got it wrong.
//
// ── Timestamp precision matters here ──────────────────────────────────────
//
// The wound swap / Beyond Death removal land at the EXACT millisecond of the
// Antilight hit. Reading a player's wound with a "<=" cutoff therefore reads
// the POST-resolution state and makes every single player look correct (this
// cost a debugging pass). The cutoff must be strictly "<".
//
// ── Ability id drift ──────────────────────────────────────────────────────
//
// The wound and Beyond Death statuses each have TWO ids live in these
// reports, and both appear within a single pull (Vmbf6WYw3QGcMntx pull 20
// and dQ8wmb1VhKt6yBXk pulls 1/11/15 carry both sets). The Antilight damage
// ids are the stable anchor and have not drifted. Any id added here must
// come from a real capture — see the README's note that Dancing Mad ability
// ids differ between reports.

import type { PlayerEvent, PlayerInfo } from "@/types/PlayerInfo";
import type { EnemyEvent, PullError } from "@/types/PullError";
import type { DeathEvent } from "@/types/DeathEvent";

export const FLOOD_WRONG_SIDE_RULE_ID = "ffxiv-kefka-says-flood-wrong-side";

// Damage abilities for the two half-room attacks. Stable across every report
// checked; these are what the detection self-gates on.
const WHITE_ANTILIGHT_ABILITY_ID = 50068;
const BLACK_ANTILIGHT_ABILITY_ID = 50069;

// Wound statuses. Both id pairs observed live — see "Ability id drift" above.
const WHITE_WOUND_ABILITY_IDS = new Set([1005541, 1004887]);
const BLACK_WOUND_ABILITY_IDS = new Set([1005542, 1004888]);

// The two instruction debuffs Grand Cross 3 hands out alongside the wound.
const ALLAGAN_FIELD_ABILITY_IDS = new Set([1000454]);
const BEYOND_DEATH_ABILITY_IDS  = new Set([1001382, 1005464]);

type WoundColor = "White" | "Black";
type Instruction = "Beyond Death" | "Allagan Field";

function woundColorOf(abilityId: number): WoundColor | null {
  if (WHITE_WOUND_ABILITY_IDS.has(abilityId)) return "White";
  if (BLACK_WOUND_ABILITY_IDS.has(abilityId)) return "Black";
  return null;
}

/**
 * Replays a player's debuff timeline up to (but NOT including — see the
 * timestamp note above) `before`, returning the wound color and Grand Cross 3
 * instruction they were carrying when the Antilight landed.
 */
function stateBefore(
  player: PlayerInfo,
  before: number
): { wound: WoundColor | null; instruction: Instruction | null } {
  let wound: WoundColor | null = null;
  let instruction: Instruction | null = null;

  for (const d of player.debuffs) {
    if (d.timestamp >= before) continue;

    const color = woundColorOf(d.abilityId);
    if (color && d.debuffStatus === "applied") wound = color;

    const isField  = ALLAGAN_FIELD_ABILITY_IDS.has(d.abilityId);
    const isBeyond = BEYOND_DEATH_ABILITY_IDS.has(d.abilityId);
    if (!isField && !isBeyond) continue;

    const which: Instruction = isBeyond ? "Beyond Death" : "Allagan Field";
    if (d.debuffStatus === "applied") instruction = which;
    else if (d.debuffStatus === "removed" && instruction === which) instruction = null;
  }

  return { wound, instruction };
}

/**
 * Flags a player who stood in the wrong half of Flood of Naught.
 *
 * Self-gates on Antilight damage, so it is safe to run on every pull — one
 * that never reaches Phase 4 returns [] without touching anything else.
 */
function detectFloodOfNaughtErrors(players: PlayerInfo[]): PullError[] {
  const errors: PullError[] = [];

  for (const player of players) {
    const hits = player.damageTaken.filter(
      (e) => e.abilityId === WHITE_ANTILIGHT_ABILITY_ID || e.abilityId === BLACK_ANTILIGHT_ABILITY_ID
    );
    if (hits.length === 0) continue;

    // Caught in the overlap near the middle, where both halves connect (the
    // notes above call this out as its own failure). That is a DIFFERENT
    // mistake from picking the wrong side, and no confirmed case exists yet
    // to model it — per the README's attribution rules, stay silent rather
    // than force it through this check and flag the wrong thing.
    const colorsTaken = new Set(
      hits.map((e) => (e.abilityId === WHITE_ANTILIGHT_ABILITY_ID ? "White" : "Black"))
    );
    if (colorsTaken.size > 1) continue;

    const hit = hits.reduce((a, b) => (a.timestamp <= b.timestamp ? a : b));
    const took: WoundColor = hit.abilityId === WHITE_ANTILIGHT_ABILITY_ID ? "White" : "Black";

    const { wound, instruction } = stateBefore(player, hit.timestamp);
    // No wound or no instruction means Grand Cross 3 never resolved onto this
    // player the way the model expects — unknown, not wrong.
    if (!wound || !instruction) continue;

    const opposite: WoundColor = wound === "White" ? "Black" : "White";
    const required: WoundColor = instruction === "Beyond Death" ? wound : opposite;
    if (took === required) continue;

    const explanation =
      instruction === "Beyond Death"
        ? "held Beyond Death with a " + wound + " Wound, so they had to take the " + required +
          " Antilight — the one matching their wound — and let Beyond Death carry them through it. They took " +
          took + " instead, leaving Beyond Death unresolved."
        : "held Allagan Field with a " + wound + " Wound, so they had to take the " + required +
          " Antilight — the opposite of their wound. They took " + took +
          " instead, which is the lethal side for that wound.";

    errors.push({
      ruleId:      FLOOD_WRONG_SIDE_RULE_ID,
      severity:    "Major",
      name:        "Wrong Side On Flood of Naught",
      description: "Stood in the wrong half of Flood of Naught: " + explanation,
      timestamp:   hit.timestamp,
      player:      player.name,
      class:       player.className,
      specId:      player.specId,
      role:        player.role,
      abilityId:   hit.abilityId,
      abilityName: hit.abilityName,
      amount:      hit.amount,
    });
  }

  return errors;
}


// ═══════════════════════════════════════════════════════════════════════════
// IMPLEMENTATION: SHORT / LONG RESOLUTION BLOCK SPREAD-vs-STACK
// ═══════════════════════════════════════════════════════════════════════════
//
// Confirmed 2026-09-02 against Vmbf6WYw3QGcMntx pull 20 (the adjudicated
// failure) and 5 clean blocks across dQ8wmb1VhKt6yBXk pulls 9/11/15.
//
// ── What resolves, and what the log calls it ──────────────────────────────
//
// When a block's Compressed Water / Forked Lightning expire, two attacks
// land at once. Which NAME is the isolated one depends on which element
// spreads, so neither name can be hard-coded as "the spread":
//
//   Grand Cross REAL -> Forked Lightning spreads -> Death Bolt hits ONLY
//                        the two spread players; Death Wave hits the rest.
//   Grand Cross FAKE -> Compressed Water spreads -> Death Wave hits ONLY
//                        the two spread players; Death Bolt hits the rest.
//
// Verified on all 6 observed blocks (dQ8w p9 both blocks REAL, p15 both
// REAL, p11 block 2 REAL, p11 block 1 FAKE — the FAKE one has exactly the
// inverted Bolt/Wave assignment). Detection never needs this mapping: it
// only uses those hits as a POSITION SOURCE (see below).
//
// ── Finding the blocks ────────────────────────────────────────────────────
//
// PlayerInfo.debuffs carries no duration, so a block's resolution time comes
// from the elemental REMOVAL event, which fires exactly at expiry. Removals
// are clustered within 300ms, and a cluster only counts as a real block when
// it satisfies ALL of the invariants every clean block shows:
//
//   - exactly 4 elemental removals,
//   - on 4 distinct players,
//   - split 2 Forked Lightning / 2 Compressed Water,
//   - ALL FOUR applied by the SAME Grand Cross.
//
// Those filters are what keep a wipe from being read as a resolution:
// debuffs also fall off when a player dies. 3MfQX7h29vPV4xYz pull 17 wiped
// before either block and produces only clusters of 1 and 7 — rejected on
// size. Vmbf6WYw3QGcMntx pull 20 gives one true block of 4 followed by
// death-removal clusters of 2 and 2.
//
// The same-Grand-Cross rule is the one that isn't obvious, and it was added
// after a real false positive. 3MfQX7h29vPV4xYz pull 12 wipes mid-phase and
// its death-removals happen to form a cluster of exactly 4 that is even
// split 2 FL / 2 CW — indistinguishable from a real block on size and
// composition alone, and it produced two phantom "failed to spread" errors.
// But three of those four elementals came from Grand Cross 1 and the fourth
// from Grand Cross 2, which a real resolution never does: the short set is
// one Grand Cross's four elementals and the long set is the other's,
// confirmed on all 6 real blocks (dQ8w p9/p11/p15 both blocks each, Vmbf
// p20 block 1).
//
// ── Judging position ──────────────────────────────────────────────────────
//
// Deliberately strategy-neutral, per the model notes above: the check asks
// only whether a player was ISOLATED (nearest other player beyond a
// threshold), never whether they stood on a particular compass point. The
// groups observed here all use support-spread-west / DPS-spread-east with
// support stacked north and DPS south, but that's one valid strategy and
// the check must not require it.
//
// Nearest-neighbour distance separates the two cases with an enormous gap:
//
//   correct STACK  0.0 - 2.8 yalms  (worst: dQ8w p11 block 1, Annania 2.8)
//   correct SPREAD 11.3 - 15.7      (best:  dQ8w p15 block 2, Rika 11.3)
//
// so the 7-yalm threshold sits in dead space with ~4y of margin on each
// side. The confirmed failures land nowhere near it: Monsieur Mittens 1.7
// and Ayumi Emi 0.7 (both owed a spread, both still in a stack), Karna
// Ferrous 16.2 (owed a stack, standing on a spread spot).
//
// Positions come from the Death Bolt / Death Wave damage events themselves —
// targetResources on the resolution hit, i.e. each player's own position at
// the exact instant the block resolved. No interpolation, no staleness
// window. Both damage ids per attack are accepted because FFLogs emits an
// unpaired "calculateddamage" preview under a second id (47897 / 47899)
// alongside the landed hit; the preview's position is identical, and its
// amount is nonsense (10,142,198 on a 325,090-HP player in Vmbf p20) so
// nothing here reads the amount.
//
// ── Death ends the analysis ───────────────────────────────────────────────
//
// Per the user's ruling (2026-09-02): the phase cannot be resolved unless
// everyone is alive, so the FIRST death caused by one of these errors emits
// a Raid-severity marker and analysis stops — later blocks are fallout and
// are never flagged. This is the same cutoff pattern phase1.ts's Graven
// Image death-wipe rule uses, and the description follows the README's rule
// that a Raid error must not assert "the raid wiped" (a raid can rez and
// keep pushing).
//
// The marker is anchored on the LETHAL HIT (the damage event that took a
// player to 0 HP), NOT on the DeathEvent. FFLogs records the death event
// ~2s after the killing blow, which would sort the marker AFTER the
// Damage Down / Petrification errors that the death itself causes. In
// Vmbf p20 the lethal Death Wave lands at +809.38s and the Petrification
// Damage Downs at +809.56s, so anchoring on the hit puts the marker where
// it belongs: before its own fallout.


/**
 * One decoded real/fake signal (FFLogs status 1002056 on a boss actor).
 * Built by the transform layer / validation harness from the enemyDebuffs
 * stream; `value` is the raw extraInfo, decoded by parity here rather than
 * at the build site so the rule stays in one place.
 */
export type KefkaSaysStateSignal = {
  timestamp: number;  // ms into the pull
  actorName: string;  // e.g. "Neo Exdeath", "Chaos"
  value:     number;  // extraInfo — even = real, odd = fake
};

export const FAILED_TO_SPREAD_RULE_ID   = "ffxiv-kefka-says-failed-to-spread";
export const FAILED_TO_STACK_RULE_ID    = "ffxiv-kefka-says-failed-to-stack";
export const ACCELERATION_BOMB_RULE_ID  = "ffxiv-kefka-says-acceleration-bomb";
export const PHASE_UNRESOLVABLE_RULE_ID = "ffxiv-kefka-says-death-unresolvable";

const GRAND_CROSS_ABILITY_ID     = 47892;
const FORKED_LIGHTNING_ABILITY_ID = 1005544;
const COMPRESSED_WATER_ABILITY_ID = 1005545;

// Both ids per attack — the second is FFLogs' unpaired calculateddamage
// preview. Position source only; amounts are never read from these.
const RESOLUTION_HIT_ABILITY_IDS = new Set([47896, 47897, 47898, 47899]);

const STATE_SIGNAL_ABILITY_ID = 1002056;

// Removals from one expiry land within a few ms; 300 is generous without
// merging the death-removal clusters that follow ~760ms later in Vmbf p20.
const REMOVAL_CLUSTER_TOLERANCE_MS = 300;

// Every clean block resolves exactly 2 Forked Lightning + 2 Compressed Water.
const ELEMENTALS_PER_BLOCK = 4;

// A debuff application belongs to the Grand Cross cast within this window —
// in practice they share a timestamp exactly.
const GRAND_CROSS_MATCH_WINDOW_MS = 2000;

// Position window around the block's resolution to accept a resolution hit.
const RESOLUTION_HIT_WINDOW_MS = 2500;

// See "Judging position" above: clean stacks top out at 2.8y, clean spreads
// bottom out at 11.3y.
const ISOLATION_THRESHOLD_YALMS = 7;

// How far back from a DeathEvent to find the hit that actually killed —
// FFLogs' lag is ~2.0s in every case measured.
const DEATH_HIT_LOOKBACK_MS = 3_000;

// A death only ends the phase "because of an error" when one of these errors
// landed shortly before it.
const DEATH_ATTRIBUTION_WINDOW_MS = 30_000;

// The Raid marker is stamped 1ms past the lethal hit, and that 1ms is
// load-bearing — do not "tidy" it away.
//
// The killing blow usually IS the error's own resolution, so the marker and
// the Major errors that caused it share a millisecond (dQ8w pull 15: both
// Acceleration Bomb errors and the marker land on the same Death Bomb at
// +832.303s). AnalysisPanel's feed concatenates raids BEFORE majors and then
// stable-sorts by timestamp, so an exact tie renders the wipe marker above
// the mistakes that caused it, which reads backwards.
//
// One millisecond is enough to order it correctly without disturbing the
// other constraint this marker has to satisfy: it must still sort AHEAD of
// the Damage Down / Petrification errors the death itself produces (Vmbf
// pull 20: marker +809.381s, shriek Damage Downs from +809.957s).
const DEATH_MARKER_SORT_OFFSET_MS = 1;

// FFLogs positions are centi-yalms.
const CENTI_YALMS_PER_YALM = 100;

type Elemental = {
  player: PlayerInfo;
  kind:   "Forked Lightning" | "Compressed Water";
  grandCrossIndex: number;
  grandCrossState: "REAL" | "FAKE";
  resolvesAt: number;
};

function distanceYalms(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y) / CENTI_YALMS_PER_YALM;
}

/**
 * Pairs each Grand Cross cast with the Neo Exdeath state signal that precedes
 * it, per the "PHASE ANCHOR AND ROUND ASSOCIATION" notes above: signals sorted
 * by time, then matched positionally to the sorted casts.
 */
function grandCrossStates(
  enemyCastEvents: EnemyEvent[],
  stateSignals:    KefkaSaysStateSignal[]
): { timestamp: number; state: "REAL" | "FAKE" }[] {
  const casts = enemyCastEvents
    .filter((e) => e.abilityId === GRAND_CROSS_ABILITY_ID)
    .map((e) => e.timestamp)
    .sort((a, b) => a - b);

  const neo = stateSignals
    .filter((s) => /neo exdeath/i.test(s.actorName))
    .sort((a, b) => a.timestamp - b.timestamp);

  return casts.map((timestamp, i) => ({
    timestamp,
    state: (neo[i] ? (neo[i].value % 2 === 0 ? "REAL" : "FAKE") : null) as "REAL" | "FAKE",
  })).filter((c) => c.state !== null);
}

/**
 * The first death of the phase, timestamped at the LETHAL HIT rather than at
 * the DeathEvent.
 *
 * Both halves of that matter. DeathEvent is the only trustworthy signal that
 * someone actually died — an earlier version of this scanned for a damage
 * event leaving the target at 0 HP, which a Dark Knight's Living Dead
 * produces without dying at all (dQ8w pull 15 has three such hits on Kitsune
 * Cassie minutes before Phase 4). But FFLogs records the DeathEvent ~2.0s
 * after the killing blow, and a marker placed there would sort AFTER the
 * Damage Down / Petrification errors the death itself causes. So the death
 * is taken from deathEvents and its timestamp from the 0-HP hit just before
 * it, falling back to the DeathEvent when the kill left no damage event at
 * all (Vmbf p20 Archidel: death at +811.38s, lethal hit at +809.38s; 3MfQ
 * p17 Sayacissa dies to an unresolved Beyond Death expiring, which carries
 * no damage event and no killing ability id, so the fallback applies).
 */
function firstPhaseDeath(
  players:     PlayerInfo[],
  deathEvents: DeathEvent[],
  from:        number
): { timestamp: number; playerName: string; abilityId: number; abilityName: string } | null {
  const deaths = deathEvents
    .filter((d) => d.timestamp >= from)
    .sort((a, b) => a.timestamp - b.timestamp);
  const death = deaths[0];
  if (!death) return null;

  const victim = players.find((p) => p.name === death.player);
  const lethal = victim?.damageTaken
    .filter((e) => e.healthAfter === 0 && e.timestamp <= death.timestamp && e.timestamp >= death.timestamp - DEATH_HIT_LOOKBACK_MS)
    .sort((a, b) => b.timestamp - a.timestamp)[0];

  return {
    timestamp:   lethal?.timestamp ?? death.timestamp,
    playerName:  death.player,
    abilityId:   lethal?.abilityId ?? death.killingAbilityGameId,
    abilityName: lethal?.abilityName ?? death.cause,
  };
}

function detectResolutionBlockErrors(
  players: PlayerInfo[],
  crosses: { timestamp: number; state: "REAL" | "FAKE" }[],
  cutoff:  number
): PullError[] {
  // Every elemental application, tagged with the Grand Cross that applied it
  // and the removal (= expiry) that resolves it.
  const elementals: Elemental[] = [];
  for (const player of players) {
    for (const d of player.debuffs) {
      if (d.debuffStatus !== "applied") continue;
      const isLightning = d.abilityId === FORKED_LIGHTNING_ABILITY_ID;
      const isWater     = d.abilityId === COMPRESSED_WATER_ABILITY_ID;
      if (!isLightning && !isWater) continue;

      const gcIndex = crosses.findIndex((c) => Math.abs(d.timestamp - c.timestamp) <= GRAND_CROSS_MATCH_WINDOW_MS);
      if (gcIndex === -1) continue;

      const removal = player.debuffs.find(
        (r) => r.abilityId === d.abilityId && r.debuffStatus === "removed" && r.timestamp > d.timestamp
      );
      if (!removal) continue; // never resolved (pull ended first) — nothing to judge

      elementals.push({
        player,
        kind:            isLightning ? "Forked Lightning" : "Compressed Water",
        grandCrossIndex: gcIndex,
        grandCrossState: crosses[gcIndex].state,
        resolvesAt:      removal.timestamp,
      });
    }
  }
  if (elementals.length === 0) return [];

  // Cluster by resolution time; only a cluster of exactly 4 is a real block.
  elementals.sort((a, b) => a.resolvesAt - b.resolvesAt);
  const clusters: Elemental[][] = [];
  for (const el of elementals) {
    const current = clusters[clusters.length - 1];
    if (current && el.resolvesAt - current[current.length - 1].resolvesAt <= REMOVAL_CLUSTER_TOLERANCE_MS) {
      current.push(el);
    } else {
      clusters.push([el]);
    }
  }

  const errors: PullError[] = [];

  for (const block of clusters) {
    if (block.length !== ELEMENTALS_PER_BLOCK) continue;
    if (new Set(block.map((el) => el.player.actorId)).size !== ELEMENTALS_PER_BLOCK) continue;
    if (block.filter((el) => el.kind === "Forked Lightning").length !== ELEMENTALS_PER_BLOCK / 2) continue;
    // All four from one Grand Cross — the filter that rejects a wipe's
    // death-removals masquerading as a block (see the notes above).
    if (new Set(block.map((el) => el.grandCrossIndex)).size !== 1) continue;

    const blockTime = block[0].resolvesAt;

    // Death ends the phase — anything from here on is fallout (see notes).
    if (blockTime > cutoff) break;

    // Everyone's position at the instant the block resolved.
    const positions = new Map<number, { x: number; y: number }>();
    for (const player of players) {
      const hit = player.damageTaken.find(
        (e) =>
          RESOLUTION_HIT_ABILITY_IDS.has(e.abilityId) &&
          e.x !== undefined && e.y !== undefined &&
          e.timestamp >= blockTime - RESOLUTION_HIT_WINDOW_MS &&
          e.timestamp <= blockTime + RESOLUTION_HIT_WINDOW_MS
      );
      if (hit) positions.set(player.actorId, { x: hit.x as number, y: hit.y as number });
    }
    if (positions.size < 2) continue; // no usable positions — unknown, not wrong

    const nearestOther = (actorId: number): number | null => {
      const self = positions.get(actorId);
      if (!self) return null;
      let best = Infinity;
      for (const [otherId, other] of positions) {
        if (otherId === actorId) continue;
        best = Math.min(best, distanceYalms(self, other));
      }
      return Number.isFinite(best) ? best : null;
    };

    const blockErrors: PullError[] = [];

    for (const el of block) {
      const mustSpread =
        el.grandCrossState === "REAL"
          ? el.kind === "Forked Lightning"
          : el.kind === "Compressed Water";

      const nearest = nearestOther(el.player.actorId);
      if (nearest === null) continue;

      const isolated = nearest > ISOLATION_THRESHOLD_YALMS;
      if (isolated === mustSpread) continue; // did the right thing

      const cross = `Grand Cross ${el.grandCrossIndex + 1}`;
      const state = el.grandCrossState === "REAL" ? "real" : "fake";
      const distance = nearest.toFixed(1);

      blockErrors.push({
        ruleId:      mustSpread ? FAILED_TO_SPREAD_RULE_ID : FAILED_TO_STACK_RULE_ID,
        severity:    "Major",
        name:        mustSpread ? "Failed To Spread" : "Failed To Stack",
        description: mustSpread
          ? `Held ${el.kind} from ${cross}, which was ${state}, so they had to spread away from the party before it expired. They were still packed in with the group instead — nearest player ~${distance} yalms away — dropping their spread on top of it.`
          : `Held ${el.kind} from ${cross}, which was ${state}, so they had to stay stacked with their group before it expired. They were off on their own instead — ~${distance} yalms from the nearest player — leaving the stack short and taking the hit alone.`,
        timestamp:   blockTime,
        player:      el.player.name,
        class:       el.player.className,
        specId:      el.player.specId,
        role:        el.player.role,
        abilityId:   el.kind === "Forked Lightning" ? FORKED_LIGHTNING_ABILITY_ID : COMPRESSED_WATER_ABILITY_ID,
        abilityName: el.kind,
      });
    }

    errors.push(...blockErrors);
  }

  return errors;
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPLEMENTATION: ACCELERATION BOMB STILLNESS / MOTION
// ═══════════════════════════════════════════════════════════════════════════
//
// Confirmed 2026-09-02 against dQ8wmb1VhKt6yBXk pull 15 (both failures
// adjudicated by the user) with a second instance in pull 3.
//
// Acceleration Bomb resolves with the state of the Grand Cross that applied
// it: REAL means stillness (no movement, no actions as it expires), FAKE
// means motion. The punish for getting it wrong is its own ability:
//
//   47893  Death Bomb
//
// Death Bomb is a pure failure signal — it appears exactly 3 times in every
// FF report on disk (dQ8w pull 15 on No Ri and Alerry Han, pull 3 on No Ri)
// and never on a correctly-resolved bomb. So detection anchors on the hit
// itself rather than trying to prove movement: player movement is not
// directly observable in FFLogs, and the position stream is far too sparse
// to infer it. This is the README's "gate on OUTCOME" rule again.
//
// The required behavior still has to be named in the error, which is why the
// check walks back from the Death Bomb to the Acceleration Bomb removal that
// resolved (within 1s — observed 270ms in pull 15), then to the application
// that removal closes, and finally to the Grand Cross that applied it.
//
// Where an action broke the stillness the log names it outright: Alerry Han
// cast First Legacy at +832.03s, the exact millisecond his bomb expired, and
// took 226,668 (his full health). No Ri has no action anywhere near his
// expiry, so his break was movement — the description omits the clause
// rather than inventing one.

const DEATH_BOMB_ABILITY_ID       = 47893;
const ACCELERATION_BOMB_ABILITY_ID = 1005546;

// Death Bomb lands shortly after the debuff falls off (270ms in dQ8w p15).
const BOMB_RESOLUTION_WINDOW_MS = 1000;

// How close an action has to be to the expiry to be named as the cause.
const BREAKING_ACTION_WINDOW_MS = 500;

function detectAccelerationBombErrors(
  players: PlayerInfo[],
  crosses: { timestamp: number; state: "REAL" | "FAKE" }[],
  cutoff:  number
): PullError[] {
  const errors: PullError[] = [];

  for (const player of players) {
    for (const bomb of player.damageTaken) {
      if (bomb.abilityId !== DEATH_BOMB_ABILITY_ID) continue;
      if (bomb.timestamp > cutoff) continue;

      // The Acceleration Bomb this punished, and the Grand Cross behind it.
      const removal = player.debuffs.find(
        (d) =>
          d.abilityId === ACCELERATION_BOMB_ABILITY_ID &&
          d.debuffStatus === "removed" &&
          Math.abs(d.timestamp - bomb.timestamp) <= BOMB_RESOLUTION_WINDOW_MS
      );
      if (!removal) continue;

      const application = player.debuffs
        .filter(
          (d) =>
            d.abilityId === ACCELERATION_BOMB_ABILITY_ID &&
            d.debuffStatus === "applied" &&
            d.timestamp < removal.timestamp
        )
        .pop();
      if (!application) continue;

      const crossIndex = crosses.findIndex(
        (c) => Math.abs(application.timestamp - c.timestamp) <= GRAND_CROSS_MATCH_WINDOW_MS
      );
      if (crossIndex === -1) continue; // unknown provenance — never guess

      const state    = crosses[crossIndex].state;
      const required = state === "REAL" ? "stillness" : "motion";

      // Name the action that broke it, when there is one.
      const breakingAction = player.casts.find(
        (c) => Math.abs(c.timestamp - removal.timestamp) <= BREAKING_ACTION_WINDOW_MS
      );

      const requirement =
        required === "stillness"
          ? "they had to be completely still — no movement and no actions — as it expired"
          : "they had to be moving as it expired";
      const evidence = breakingAction
        ? ` They used ${breakingAction.abilityName} at the moment it went off.`
        : "";

      errors.push({
        ruleId:      ACCELERATION_BOMB_RULE_ID,
        severity:    "Major",
        name:        required === "stillness" ? "Moved With Acceleration Bomb" : "Stood Still With Acceleration Bomb",
        description: `Held Acceleration Bomb from Grand Cross ${crossIndex + 1}, which was ${state === "REAL" ? "real" : "fake"}, so ${requirement}.${evidence} Death Bomb detonated on them for ${bomb.amount?.toLocaleString() ?? "?"}.`,
        timestamp:   bomb.timestamp,
        player:      player.name,
        class:       player.className,
        specId:      player.specId,
        role:        player.role,
        abilityId:   DEATH_BOMB_ABILITY_ID,
        abilityName: bomb.abilityName,
        amount:      bomb.amount,
      });
    }
  }

  return errors;
}

/**
 * Phase 4 ("Kefka Says") detection entry point. Returns [] for any pull that
 * never reaches the phase — every check self-gates on its own evidence
 * (Antilight damage; a resolved block of 4 elementals; a Death Bomb) rather
 * than on an encounter-name check, so it is safe to always call.
 * `stateSignals` may be empty on captures fetched before lib/ffl-client.ts
 * started requesting enemy debuffs — the state-dependent checks then report
 * nothing rather than guessing.
 *
 * The phase cutoff and the Raid marker live here rather than inside any one
 * check, because a pull has exactly ONE first death no matter which mistake
 * caused it: whichever check fires, the marker is emitted once and everything
 * after it is fallout.
 */
export function detectKefkaSaysErrors(
  players:         PlayerInfo[],
  deathEvents:     DeathEvent[] = [],
  enemyCastEvents: EnemyEvent[] = [],
  stateSignals:    KefkaSaysStateSignal[] = []
): PullError[] {
  const floodErrors = detectFloodOfNaughtErrors(players);

  const crosses = grandCrossStates(enemyCastEvents, stateSignals);
  if (crosses.length === 0) return floodErrors.sort((a, b) => a.timestamp - b.timestamp);

  // Scoped to the phase (Grand Cross 1 onward), NOT the whole pull: a death
  // in an earlier phase that the party rezzed through says nothing about
  // whether Kefka Says is still resolvable. Vmbf6WYw3QGcMntx pull 20 is
  // exactly that case — Sayacissa Morsaelth dies in Phase 3 and is raised
  // well before Phase 4 — and an unscoped cutoff suppressed every error in
  // the pull.
  const death  = firstPhaseDeath(players, deathEvents, crosses[0].timestamp);
  const cutoff = death ? death.timestamp : Number.POSITIVE_INFINITY;

  const errors = [
    ...floodErrors,
    ...detectResolutionBlockErrors(players, crosses, cutoff),
    ...detectAccelerationBombErrors(players, crosses, cutoff),
  ].sort((a, b) => a.timestamp - b.timestamp);

  // The death only ends the phase "because of an error" if one of these
  // errors landed shortly before it — otherwise it is someone else's
  // problem and this module has nothing to say about it.
  const causedByError = death
    ? errors.some(
        (e) => e.timestamp <= death.timestamp && e.timestamp >= death.timestamp - DEATH_ATTRIBUTION_WINDOW_MS
      )
    : false;

  if (death && causedByError) {
    // Not every kill has a named ability: 3MfQX7h29vPV4xYz pull 17's
    // Sayacissa dies to an unresolved Beyond Death simply expiring, which
    // FFLogs records with killingAbilityGameId 0 and resolves to the
    // placeholder "Environmental". Say "died" rather than name that.
    const namedCause = death.abilityId !== 0 && !/^environmental$/i.test(death.abilityName ?? "");
    errors.push({
      ruleId:      PHASE_UNRESOLVABLE_RULE_ID,
      severity:    "Raid",
      name:        "Phase Unresolvable After Death",
      description: `${death.playerName} ${namedCause ? `was killed by ${death.abilityName}` : "died"}. Kefka Says needs all eight players alive to finish resolving — every remaining debuff, gaze and replay from here is treated as fallout and is not analysed further.`,
      timestamp:   death.timestamp + DEATH_MARKER_SORT_OFFSET_MS,
      abilityId:   death.abilityId,
      abilityName: death.abilityName,
    });
  }

  return errors;
}
