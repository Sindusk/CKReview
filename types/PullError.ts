// types/PullError.ts
//
// Declarative error-detection rules + the concrete occurrences detected
// from them during a pull. Edit ERROR_RULES in lib/error-rules.ts to add
// new detections — this file only defines the shapes.

export type ErrorSeverity = "Major" | "Minor" | "Raid";
export type ErrorGame = "wow" | "ffxiv";

// A rule is triggered one of four ways:
//
//   "damage"           — a DamageTaken event on `abilityId`, optionally gated
//                         by a minimum effective (post-mitigation) amount
//                         and/or a debuff that must (or must not) currently be
//                         active on the player at the moment of the hit.
//
//   "debuffApplied"    — simply receiving `abilityId` (a debuff) at all, e.g.
//                         FFXIV's Damage Down. Fires once per application, not
//                         once per stack refresh.
//
//   "enemyCast"        — any enemy (NPC) actor successfully completing a cast
//                         of `abilityId`. "Successfully" means the "cast"
//                         event fired (as opposed to "begincast") — an
//                         interrupted cast never reaches "cast".
//
//   "enemyBuffApplied" — an enemy (NPC) actor — typically the boss — gaining
//                         the buff `abilityId`. Fires once per application.
//
// "enemyCast" and "enemyBuffApplied" are raid-wide: they're not attributable
// to any one friendly player, which is why PullError.player/class/role below
// are optional rather than required.
export type PullErrorRule = {
  id:          string;    // stable id, also used as a React key
  game:        ErrorGame; // documentation only — ability IDs are already
                           // effectively namespaced per game
  severity:    ErrorSeverity;
  name:        string;             // short display name
  description: string;             // explanation shown in the UI

  trigger:     "damage" | "debuffApplied" | "enemyCast" | "enemyBuffApplied";
  abilityId:   number;             // ability id relevant to the trigger

  // ── "damage" trigger only ────────────────────────────────────────────────
  minEffectiveDamage?: number;     // event.amount must be STRICTLY greater than this
  requiredDebuffId?:   number;     // player must currently be carrying this debuff
  forbiddenDebuffId?:  number;     // player must NOT currently be carrying this debuff
};

// A concrete occurrence of a rule firing during a specific pull.
//
// `player` / `class` / `role` are present for player-attributable errors
// (Major, Minor, and player-triggered Raid errors from "damage"/"debuffApplied"
// rules) but are intentionally ABSENT for raid-wide errors that aren't any
// one person's fault — enemy casts, enemy buffs, and the manual "Call Wipe"
// marker. UI code must treat these as optional.
export type PullError = {
  ruleId:      string;
  severity:    ErrorSeverity;
  name:        string;
  description: string;

  timestamp:   number;   // ms into the pull — same convention as DeathEvent
  player?:     string;
  class?:      string;
  // Blizzard spec ID (WoW only) — lets the UI show a spec-specific icon
  // instead of just a class-level one. Always 0 for FFXIV (job doubles as
  // spec there, so it's meaningless — icon lookup ignores it and uses
  // `class` directly for FFXIV). Optional/absent for the same reason
  // `class`/`role` are: raid-wide errors aren't attributable to a player.
  specId?:     number;
  role?:       "Tank" | "Healer" | "DPS";

  abilityId:   number;
  abilityName: string;
  // Fully-resolved icon URL for this ability (via lib/ability-icons.ts),
  // or undefined if the report's masterData didn't carry one — e.g. the
  // manually-created "Call Wipe" marker (abilityId 0) never has one.
  abilityIcon?: string;
  amount?:      number;   // effective damage that triggered it, when applicable
};

// Stable ruleId for the manually-created "Call Wipe" Raid error, so the UI
// can detect whether one already exists on a pull. This is independent of
// any auto-detected Raid errors — a pull can have plenty of those and still
// show the "Call Wipe" button, per product decision.
export const CALL_WIPE_RULE_ID = "manual-call-wipe";

/**
 * Builds the manually-created "Call Wipe" Raid error. Appended directly to
 * a pull's `errors` array by page.tsx's onCallWipe handler — this is NOT
 * produced by detectPullErrors/ERROR_RULES like the others.
 */
export function createCallWipeError(timestampMs: number): PullError {
  return {
    ruleId:      CALL_WIPE_RULE_ID,
    severity:    "Raid",
    name:        "Wipe Called",
    description: "The raid wipe was manually marked at this time.",
    timestamp:   timestampMs,
    abilityId:   0,
    abilityName: "Call Wipe",
  };
}

// A raid-wide event not tied to a specific friendly player — an enemy cast
// completing, or an enemy gaining a buff. This is the input to the
// "enemyCast" / "enemyBuffApplied" rule evaluators in error-detection.ts.
export type EnemyEvent = {
  timestamp:   number;  // ms into the pull
  actorId:     number;
  actorName:   string;
  abilityId:   number;
  abilityName: string;
  // Fully-resolved icon URL for this ability (via lib/ability-icons.ts),
  // or undefined if unavailable.
  abilityIcon?: string;
};
