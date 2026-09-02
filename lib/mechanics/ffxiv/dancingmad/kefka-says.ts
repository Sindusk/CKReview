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
// The log confirms the color rule mechanically rather than by assumption:
// across all 8 Flood resolutions, the Antilight matching a player's wound
// deals their FULL health and the opposite color deals a fixed chip amount.
// Detection deliberately keys on the color relationship rather than on that
// damage split, because the chip number varies by report (999 in
// 3MfQX7h29vPV4xYz, 66000 in dQ8wmb1VhKt6yBXk pull 1) while the color
// relationship does not.
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

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { PullError } from "@/types/PullError";

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

/**
 * Phase 4 ("Kefka Says") detection entry point. Returns [] for any pull that
 * never reaches Flood of Naught — self-gating on Antilight damage rather than
 * an encounter-name check, so it is safe to always call.
 */
export function detectKefkaSaysErrors(players: PlayerInfo[]): PullError[] {
  return detectFloodOfNaughtErrors(players).sort((a, b) => a.timestamp - b.timestamp);
}
