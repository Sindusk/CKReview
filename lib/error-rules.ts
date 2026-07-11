// lib/error-rules.ts
//
// Hand-maintained table of error-detection rules. Add a new entry any time
// you want the AnalysisPanel's Raid/Major/Minor tabs to pick up a new kind
// of mistake — nothing else needs to change, lib/error-detection.ts reads
// this table generically.
//
// HOW TO ADD A RULE:
//   trigger: "damage"           — fires when a player takes damage from
//                                  `abilityId`. Optionally require
//                                  minEffectiveDamage (the post-mitigation
//                                  `amount` field) and/or a debuff that must
//                                  be active on the player at the moment of
//                                  the hit (requiredDebuffId) or must NOT be
//                                  active (forbiddenDebuffId).
//   trigger: "debuffApplied"    — fires the moment `abilityId` (a debuff) is
//                                  applied to the player, once per application.
//   trigger: "enemyCast"        — fires the moment any enemy (NPC) actor
//                                  completes a cast ("cast", not "begincast")
//                                  of `abilityId`. Raid-wide — not
//                                  attributable to a specific player.
//   trigger: "enemyBuffApplied" — fires the moment any enemy (NPC) actor —
//                                  typically the boss — gains the buff
//                                  `abilityId`. Raid-wide — not attributable
//                                  to a specific player.
//
// severity: "Major" | "Minor" | "Raid". Raid errors are for raid-wide
// mistakes that aren't any one person's fault and almost always mean a
// wipe — see AnalysisPanel's Raid tab and the Report's truncation logic in
// lib/report-data.ts.
//
// Some raid mechanics have more than one relevant ability ID (e.g. a
// "Light" and "Void" variant) — these are simply added as separate rule
// entries with the same severity, rather than extending the rule shape to
// support arrays, to keep evaluation logic simple.
//
// Ability IDs: look them up on wowhead.com/spell=<ID> (WoW) or from the
// FFLogs report's event/ability data (FFXIV).

import type { PullErrorRule } from "@/types/PullError";

export const ERROR_RULES: PullErrorRule[] = [

  // ── World of Warcraft ────────────────────────────────────────────────────

  // -- Beloren --
  {
    id:          "wow-voidlight-rupture-overdamage",
    game:        "wow",
    severity:    "Major",
    name:        "Voidlight Rupture Overdamage",
    description:
      "Took damage from Voidlight Rupture while holding opposite element feather.",
    trigger:            "damage",
    abilityId:           1243866,   // Voidlight Rupture
    minEffectiveDamage:  300000,
  },

  {
    id:          "wow-void-flames-light-feather",
    game:        "wow",
    severity:    "Major",
    name:        "Void Flames while Light Feathered",
    description: "Hit by the initial impact of Void Flames while still carrying the Light Feather debuff.",
    trigger:           "damage",
    abilityId:          1242815,   // Void Flames
    requiredDebuffId:   1241162,   // Light Feather
    excludeTicks:       true,
  },

  {
    id:          "wow-light-flames-void-feather",
    game:        "wow",
    severity:    "Major",
    name:        "Light Flames while Void Feathered",
    description: "Hit by the initial impact of Light Flames while still carrying the Void Feather debuff.",
    trigger:           "damage",
    abilityId:          1242803,   // Light Flames
    requiredDebuffId:   1241163,   // Void Feather
    excludeTicks:       true,
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

  {
    id:          "wow-minor-light-patch",
    game:        "wow",
    severity:    "Minor",
    name:        "Stood in Light Patch",
    description: "Took damage from standing in a Light Patch.",
    trigger:    "damage",
    abilityId:   1241840,          // Light Patch
  },

  {
    id:          "wow-minor-void-patch",
    game:        "wow",
    severity:    "Minor",
    name:        "Stood in Void Patch",
    description: "Took damage from standing in a Void Patch.",
    trigger:    "damage",
    abilityId:   1241841,          // Void Patch
  },

  // -- Midnight Falls --

  {
    id:          "wow-heavens-glaives",
    game:        "wow",
    severity:    "Major",
    name:        "Hit By Heaven's Glaives",
    description: "Took damage from Heaven's Glaives.",
    trigger:     "killingBlow",
    abilityId:   1254076,          // Heaven's Glaives
  },

  {
    id:          "wow-death-dark-quasar",
    game:        "wow",
    severity:    "Major",
    name:        "Death to Dark Quasar",
    description: "Died to the Dark Quasar beam's killing blow.",
    trigger:     "killingBlow",
    abilityId:    1282469,         // Dark Quasar beam
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

  // ── Raid-wide errors (severity: "Raid") ─────────────────────────────────
  //
  // These aren't any one player's fault, they represent the raid as a whole
  // failing a mechanic, and are severe enough to almost always cause a wipe.

  // -- Beloren --

  {
    id:          "wow-raid-light-eruption",
    game:        "wow",
    severity:    "Raid",
    name:        "Ember Eruption (Light)",
    description: "The interrupt on the Light Ember was missed.",
    trigger:     "enemyCast",
    abilityId:    1243852,         // Light Eruption
  },
  {
    id:          "wow-raid-void-eruption",
    game:        "wow",
    severity:    "Raid",
    name:        "Ember Eruption (Void)",
    description: "The interrupt on the Void Ember was missed.",
    trigger:     "enemyCast",
    abilityId:    1243854,         // Void Eruption
  },

  {
    id:          "wow-raid-light-echo",
    game:        "wow",
    severity:    "Raid",
    name:        "Orb Echo (Light)",
    description: "A player took damage from Eruption Light Echo — a light orb hit the boss.",
    trigger:     "damage",
    abilityId:    1262736,         // Eruption Light Echo
  },
  {
    id:          "wow-raid-void-echo",
    game:        "wow",
    severity:    "Raid",
    name:        "Orb Echo (Void)",
    description: "A player took damage from Erupting Void Echo — a void orb hit the boss.",
    trigger:     "damage",
    abilityId:    1262737,         // Erupting Void Echo
  },

  {
    id:          "wow-raid-ember-rebirth",
    game:        "wow",
    severity:    "Raid",
    name:        "Ember Rebirth",
    description: "An Ember's egg was not killed in time and it respawned.",
    trigger:     "enemyCast",
    abilityId:    1263412,         // Rebirth
  },

  {
    id:          "wow-raid-guardian-edict",
    game:        "wow",
    severity:    "Raid",
    name:        "Guardian Edict",
    description: "A frontal was executed incorrectly, enraging the boss.",
    trigger:     "enemyBuffApplied",
    abilityId:    1260826,         // Guardian Edict
  },
  
  // -- Midnight Falls --

  {
    id:          "wow-raid-terminate-cast",
    game:        "wow",
    severity:    "Raid",
    name:        "Terminate Cast",
    description: "The interrupt on the termination matrix's Terminate cast was missed.",
    trigger:     "enemyCast",
    abilityId:    1286276,         // Terminate
  },

];
