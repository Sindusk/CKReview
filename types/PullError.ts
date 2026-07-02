// types/PullError.ts
//
// Declarative error-detection rules + the concrete occurrences detected
// from them during a pull. Edit ERROR_RULES in lib/error-rules.ts to add
// new detections — this file only defines the shapes.

export type ErrorSeverity = "Major" | "Minor";
export type ErrorGame = "wow" | "ffxiv";

// A rule is triggered one of two ways:
//
//   "damage"        — a DamageTaken event on `abilityId`, optionally gated
//                      by a minimum effective (post-mitigation) amount
//                      and/or a debuff that must (or must not) currently be
//                      active on the player at the moment of the hit.
//
//   "debuffApplied" — simply receiving `abilityId` (a debuff) at all, e.g.
//                      FFXIV's Damage Down. Fires once per application, not
//                      once per stack refresh.
export type PullErrorRule = {
  id:          string;    // stable id, also used as a React key
  game:        ErrorGame; // documentation only — ability IDs are already
                           // effectively namespaced per game
  severity:    ErrorSeverity;
  name:        string;             // short display name
  description: string;             // explanation shown in the UI

  trigger:     "damage" | "debuffApplied";
  abilityId:   number;             // damage ability id OR debuff ability id, per trigger

  // ── "damage" trigger only ────────────────────────────────────────────────
  minEffectiveDamage?: number;     // event.amount must be STRICTLY greater than this
  requiredDebuffId?:   number;     // player must currently be carrying this debuff
  forbiddenDebuffId?:  number;     // player must NOT currently be carrying this debuff
};

// A concrete occurrence of a rule firing during a specific pull.
export type PullError = {
  ruleId:      string;
  severity:    ErrorSeverity;
  name:        string;
  description: string;

  timestamp:   number;   // ms into the pull — same convention as DeathEvent
  player:      string;
  class:       string;
  role:        "Tank" | "Healer" | "DPS";

  abilityId:   number;
  abilityName: string;
  amount?:     number;   // effective damage that triggered it, when applicable
};
