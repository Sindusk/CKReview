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
// excludeRoles: ["Tank"] — the player-attributable triggers ("damage",
// "debuffApplied", "killingBlow") skip players in the listed roles, for
// mechanics where a role is supposed to take the hit.
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
    // Tanks are expected to eat the flames — only healers/DPS are at fault.
    excludeRoles:       ["Tank"],
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
    // Tanks are expected to eat the flames — only healers/DPS are at fault.
    excludeRoles:       ["Tank"],
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
  //
  // Midnight Falls detection lives in lib/mechanics/wow/vs-dr-mqd/
  // midnightfalls.ts — the encounter grew past what single-ability rules
  // can express, so its declarative rules AND its correlation logic are
  // kept together in that module.

  // ── FFXIV ────────────────────────────────────────────────────────────────

  // Abilities whose Damage Down is NOT the recipient's fault. Damage Down is
  // normally a reliable "you personally missed a mechanic" marker, which is
  // why the rule below fires on the debuff itself rather than on any specific
  // attack — but a few Dancing Mad abilities hand it out as an unavoidable
  // raid-wide consequence of something else going wrong, and blaming whoever
  // caught it violates the root-cause rule (lib/mechanics/README.md).
  // Confirmed in report PM8HY9nJ7kTR4tdQ during VOD review:
  //   pull 1  — White Hole blanketed 6 players at once
  //   pull 9  — The River of Light, raid-wide
  //   pull 23 — All Things Ending (two IDs, one per boss copy)
  // The underlying failure still surfaces through whatever mechanic module
  // owns it; only the derivative Damage Down is silenced.
  {
    id:          "ffxiv-damage-down",
    game:        "ffxiv",
    severity:    "Major",
    name:        "Damage Down",
    description: "Received the Damage Down debuff — a mechanic was missed or failed.",
    trigger:    "debuffApplied",
    abilityId:   1002911,          // Damage Down
    excludeCauseAbilityIds: [
      48486,   // White Hole
      47807,   // The River of Light
      47836,   // All Things Ending (Exdeath)
      47837,   // All Things Ending (Chaos)
      // Phase 5: ultimate-kefka.ts owns these with mechanic-specific errors.
      // Stardust is the party-wide penalty for an unsoaked Celestriad tower.
      49769,   // Flood (line)
      47946,   // Quake
      47947,   // Tornado
      47933,   // Stray Apocalypse
      47942,   // Stardust Fire III
      47943,   // Stardust Blizzard III
      47944,   // Stardust Thunder III
      // Vamp Fatale: vamp-fatale.ts owns every one of its penalty causes
      // (avoidable hits, bats, chains, puddle lines and overlaps) and the
      // raid-wide ones (Barbed Burst, Doornail Explosion) blame nobody.
      45928, 45929, 45930,                                   // Coffinfiller
      45943, 45944, 45945, 45946, 45947, 45948, 45949, 45950, // Half Moon
      45939,   // Pulping Pulse
      45941,   // Blast Beat (bat)
      45969, 45971, 45972,                                   // Aetherletting cone / line / overlap
      45965,   // Barbed Burst
      45966,   // Explosion (Deadly Doornail)
      45976,   // Naughty Knot
      45987,   // Explosion (bat chain)
      45989, 45991,                                          // Sanguine Scratch
      45992, 45993, 45994, 45995,                            // Breakdown Drop / Breakwing Beat
    ],
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

];
