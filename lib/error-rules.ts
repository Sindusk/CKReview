// lib/error-rules.ts
//
// Hand-maintained table of error-detection rules. Add a new entry any time
// you want the AnalysisPanel's Major/Minor tabs to pick up a new kind of
// mistake — nothing else needs to change, lib/error-detection.ts reads this
// table generically.
//
// HOW TO ADD A RULE:
//   trigger: "damage"         — fires when a player takes damage from `abilityId`.
//                                Optionally require minEffectiveDamage (the
//                                post-mitigation `amount` field) and/or a debuff
//                                that must be active on the player at the moment
//                                of the hit (requiredDebuffId) or must NOT be
//                                active (forbiddenDebuffId).
//   trigger: "debuffApplied"  — fires the moment `abilityId` (a debuff) is
//                                applied to the player, once per application.
//
// Ability IDs: look them up on wowhead.com/spell=<ID> (WoW) or from the
// FFLogs report's event/ability data (FFXIV).

import type { PullErrorRule } from "@/types/PullError";

export const ERROR_RULES: PullErrorRule[] = [

  // ── World of Warcraft ────────────────────────────────────────────────────

  {
    id:          "wow-voidlight-rupture-overdamage",
    game:        "wow",
    severity:    "Major",
    name:        "Voidlight Rupture Overdamage",
    description:
      "Took more than 300,000 effective damage from Voidlight Rupture. " +
      "Some players are meant to be immune via the strategy — this only " +
      "fires if the hit actually landed for real damage.",
    trigger:            "damage",
    abilityId:           1243866,   // Voidlight Rupture
    minEffectiveDamage:  300000,
  },

  {
    id:          "wow-light-quill-void-feather",
    game:        "wow",
    severity:    "Minor",
    name:        "Light Quill while Void Feathered",
    description: "Hit by Light Quill while still carrying the Void Feather debuff.",
    trigger:           "damage",
    abilityId:          1242093,   // Light Quill
    requiredDebuffId:   1241163,   // Void Feather
  },

  {
    id:          "wow-void-quill-light-feather",
    game:        "wow",
    severity:    "Minor",
    name:        "Void Quill while Light Feathered",
    description: "Hit by Void Quill while still carrying the Light Feather debuff.",
    trigger:           "damage",
    abilityId:          1242094,   // Void Quill
    requiredDebuffId:   1241162,   // Light Feather
  },

  // ── FFXIV ────────────────────────────────────────────────────────────────

  {
    id:          "ffxiv-damage-down",
    game:        "ffxiv",
    severity:    "Major",
    name:        "Damage Down",
    description: "Received the Damage Down debuff — a mechanic was missed or failed.",
    trigger:    "debuffApplied",
    abilityId:   1002911,          // Damage Down
  },

];
