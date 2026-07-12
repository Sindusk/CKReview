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

  // Verified against MFTerminateFailPull2.json (fight 2, actor 55
  // "Termination Matrix"): 1284934 is the "Terminate" CAST spell — the ID
  // that shows up as a "cast"-type completion in the enemyCasts stream,
  // which is what the "enemyCast" trigger reads. 1286276 is a distinct
  // "Terminate"-named ability WCL uses for the killing blow/damage effect
  // and never appears in enemyCasts — using it here (as the previous
  // version of this rule did) meant the trigger could never match.
  {
    id:          "wow-raid-terminate-cast",
    game:        "wow",
    severity:    "Raid",
    name:        "Terminate Cast",
    description: "The interrupt on the termination matrix's Terminate cast was missed.",
    trigger:     "enemyCast",
    abilityId:    1284934,         // Terminate (cast)
  },

  // Verified against MFDissonanceFailPull1.json vs MFDissonanceSuccessPull55.json:
  // 1249584 is the "Dissonance" DEBUFF applied to the player who used their
  // Dark Rune out of order (5 applications in the fail pull, 0 in the clean
  // one). The follow-up AoE that actually wipes the raid is logged under a
  // separate "Dissonance"-named ability (1249585, the killingAbilityGameID
  // on the resulting deaths) that never appears in any fetched stream —
  // same cast-ID-vs-damage-ID split seen on Terminate above — so the debuff
  // application itself (1249584) is what the rule keys on. Raid-severity
  // per product decision even though it's player-attributable, same as
  // other debuffApplied-triggered Raid errors.
  {
    id:          "wow-raid-dissonance",
    game:        "wow",
    severity:    "Raid",
    name:        "Dissonance",
    description: "A Dark Rune was activated out of order, triggering Dissonance.",
    trigger:     "debuffApplied",
    abilityId:    1249584,         // Dissonance (debuff)
  },

  // Verified against MFLightsEndPull31.json: 1284699 "Light's End" hits
  // only the 1-2 players caught by it (raid-target-marked) for ~150k-260k
  // each — it's the damage from an improperly-destroyed Dawn Crystal, not
  // the wipe's actual killing blow. Most deaths in that pull are credited
  // to 1254256 "Naaru's Lament" instead (see wow-raid-naaru-lament below —
  // the boss's missed-soak punishment), which finishes off whoever Light's
  // End left low. minEffectiveDamage filters out the fully-absorbed
  // 0-amount duplicate entries WCL logs alongside each real hit.
  {
    id:          "wow-raid-lights-end",
    game:        "wow",
    severity:    "Raid",
    name:        "Light's End",
    description: "A Dawn Crystal was destroyed, unleashing Light's End.",
    trigger:            "damage",
    abilityId:           1284699,   // Light's End
    minEffectiveDamage:  100000,
  },

  // MFNaaruLamentPull36.json (the log meant to verify this) turned out to
  // have empty deaths/casts/debuffs/enemyCasts/enemyBuffs streams — its
  // cursors were already exhausted from an earlier session, so it only
  // captured a stale empty tail page. Used MFLightsEndPull31.json instead,
  // which already had full data and happens to also feature this ability:
  // 1254256 "Naaru's Lament" lands as a pure environmental damageTaken hit
  // (sourceID -1 — not a real NPC actor), simultaneously on ~20 players in
  // a ~250ms window, 9 of them fatally. Since there's no actual NPC
  // "casting" it, it never appears in enemyCasts/enemyBuffs/debuffs — only
  // "damage" can see it. minEffectiveDamage filters the two 0-amount
  // fully-absorbed duplicate entries seen alongside the real (19k-482k)
  // hits. UNVERIFIED against a dedicated Naaru's Lament pull — re-check
  // once MFNaaruLamentPull36.json (or a fresh capture) has real data, in
  // particular whether the soak-miss itself is separately detectable
  // (a debuff/marker on the missed soak spot) rather than only the
  // resulting damage.
  {
    id:          "wow-raid-naaru-lament",
    game:        "wow",
    severity:    "Raid",
    name:        "Naaru's Lament",
    description: "A ground soak was missed, triggering Naaru's Lament.",
    trigger:            "damage",
    abilityId:           1254256,   // Naaru's Lament
    minEffectiveDamage:  10000,
  },

];
