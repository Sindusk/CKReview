# WoWAnalyzer audit: Preservation Evoker

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Evoker shared layer,
  then the spec), spot-checked at their source lines (3 of
  3 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares 12.1.0, fully maintained; last change 2026-08-24
  (Echo analyzer and Merithra's Blessing casts). About 70 modules, but the
  guide has only three parts (core spells and buffs, healing cooldowns,
  preparation); there is no priority list and no checklist. Several modules
  compute getters nothing displays. Everything graded is healer quality
  (target coverage, proc use, overheal); the spec has almost no damage
  rotation.
- **App:** `lib/damage/wow/specs/healer.ts` (`"Preservation Evoker"` uses
  the shared `HEALER_CHECKS`: wasted heal GCDs, valued at the healer's
  damage filler, marked inference), the generic checks (`checkGcdGaps`,
  `checkDeaths`), nothing in `tracked-cooldowns.ts` (only Devastation and
  Augmentation are keyed there), and no potion check for healers
  (`potion.ts` returns early for the Healer role). Preservation has 9
  survey players and no case study.
- **Phase 3:** not started.
- **Core rules** (active time, cast efficiency, cancelled casts) are in
  [core.md](core.md); rows below cover only what Preservation sets or adds.
  The Evoker class layer (Fire Breath efficiency, Devastation and
  Augmentation proc analyzers) does not apply to this spec, except its
  utility and defensives, which are one row here.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| evoker-preservation/AlwaysBeCasting/downtime-pct | superseded | `checkGcdGaps` | none | idle time | Above 40 / 55% of the whole fight idle (the third step, 100%, can't be reached). Far looser than the DPS default, and healer idle is partly forced. The whole-fight denominator counts Stasis-like time. Shown only as a statistic. |
| evoker-preservation/AlwaysBeCasting/non-healing-time | no-damage | — | Energy Loop, Life-Giver's Flame | time not on a healing cast | Above 40 / 50 / 55% of the fight. Grades healing as the work, with a hand-kept list (Disintegrate and Fire Breath count as healing only under those talents), so a player damaging in a quiet spell window is marked down. The app goes the other way (damage filler is the healer's choice, not judged). Not shown in the guide. |
| evoker-preservation/Abilities/reversion-efficiency | no-damage | — | Reversion | Reversion cast under 60% of possible charges | A healing cooldown with a lowered 60% target. Whole-fight, forced time counted as ready, no cooldown reduction modelled. Not tracked in the app. |
| evoker-preservation/Abilities/dream-breath-efficiency | no-damage | — | Spiritual Clarity, Instability Matrix, Legacy of the Lifebinder, Font of Magic | Dream Breath cast under 80% of possible uses | A heal. Whole-fight denominator; its cooldown model depends on talent values hand-set in the code plus runtime reductions (Nozdormu's Teachings, Temporal Burst), so a missed reduction skews it both ways. Not tracked in the app. |
| evoker-preservation/Abilities/dream-flight-efficiency | no-damage | — | Dream Flight | Dream Flight cast under 80% of possible uses | A heal; the guide wants it on clumped damage, which efficiency doesn't check. Whole-fight, last use expected even if the fight ends first. |
| evoker-preservation/Abilities/stasis-efficiency | no-damage | — | Stasis | Stasis or its release under 80% | Two entries on one 90s model, so one Stasis and its release can be judged twice, and a Stasis held for a late release reads as a miss. Held time counts as ready. |
| evoker-preservation/Abilities/no-target-spells | no-damage | — | Nozdormu Adept, Temporal Artificer | — | Echo, Time Dilation, Temporal Anomaly, Rewind and Merithra's Blessing are declared with no target. Never grades. |
| evoker-preservation/Guide/cast-efficiency-bars | superseded | — | per spell | as the spellbook rows | Guide bars for Dream Breath, Dream Flight, Stasis and Temporal Anomaly redraw the same efficiency numbers, with gap highlighting that marks forced time as available. |
| evoker-preservation/DreamBreath/targets-per-cast | no-damage | — | none | a cast hitting fewer than 5 targets | Full group is 6 if the log shows more than 5 combatants, so in a 20-player raid the cap is still one party. Healing coverage. |
| evoker-preservation/DreamBreath/average-targets | no-damage | — | none | average under 5 | A getter nothing displays. |
| evoker-preservation/DreamFlight/targets-hit | no-damage | — | Dream Flight | under 75% of players hit | The denominator is every combatant in the report; a spread-out boss makes it unfixable. Healing coverage. |
| evoker-preservation/DreamFlight/overhealing | no-damage | — | Dream Flight | over 40% overheal on a cast | Raid damage decides it, not the player. The app's `healGcds` is the nearest check, but it grades heal GCDs, not this ability's casts, and values them as the damage filler. |
| evoker-preservation/DreamFlight/average-group-hit | no-damage | — | Dream Flight | average under 70% | A getter nothing displays. |
| evoker-preservation/EmeraldBlossom/per-cast | no-damage | — | Essence Burst, Fluttering Seedlings | a Blossom cast without an Essence Burst, or hitting under 5 targets | Healing. Fails a Blossom the raid damage may have needed. |
| evoker-preservation/EssenceBurst/consumption | no-damage | — | Essence Burst, Twin Echoes, Energy Loop, Essence Attunement | a proc expiring unspent or refreshed | A wasted proc is a lost free heal. The one damage reading, a proc spent on Disintegrate, is graded Fail by this rule unless Energy Loop is taken, so the rule counts damage as the wrong spend. Pre-pull procs are not seeded. |
| evoker-preservation/EssenceBurst/expired-count | no-damage | — | Essence Burst | any expired proc, or fewer than 3 procs | Getters nothing displays; a short pull would trip the fewer-than-3 limit. |
| evoker-preservation/Stasis/stored-spells | no-damage | — | Stasis | Stasis holding anything but Temporal Anomaly, Emerald Blossom, Merithra's Blessing or Dream Breath | Healing setup. Pre-pull Stasis is inferred from the buff, but its spells show as unknown and fail. |
| evoker-preservation/InnerFlame/window | no-damage | — | Inner Flame | — | Always Good with an empty checklist; nothing is checked. |
| evoker-preservation/AncientFlame/refresh-waste | no-damage | — | Ancient Flame | Blossom or Verdant Embrace cast before the Living Flame that spends it | A wasted refresh of a heal-boosting buff; not shown in the guide. |
| evoker-preservation/Ouroboros/stacks-on-blossom | no-damage | — | Ouroboros, Echo | Blossom with under 3 stacks | Healing. The trigger is any removal, expiry included. Not shown in the guide. |
| evoker-preservation/Echo/expired-echoes | no-damage | — | Echo | an Echo expiring unused | A getter nothing displays; deaths expire Echoes outside the player's control. |
| evoker-shared/utility | no-damage | — | — | — | Cauterizing Flame, Zephyr, Landslide, Expunge, Sleep Walk, Quell, Oppressing Roar, Rescue, Time Spiral, Hover, Source of Magic, Obsidian Scales and the rest are declared with no target. Utility and defensives aren't judged. |
| evoker-preservation/statistics | no-damage | — | — | — | Display only: cooldown throughput for Dream Flight and Rewind windows, mastery effectiveness, Essence overcapped, mana charts, Essence Burst donuts, Echo breakdowns, and the per-talent healing figures (Time of Need, Lifespark, Field of Dreams, Call of Ysera, Time Lord and the like). |

Not rules (models the rules above rest on): the normalizers and event links
(casts to Dream Breath applications, Echo copies, Essence Burst spends,
Stasis stored spells, Merithra's heals), the HoT tracker and attributor
(which HoT came from Echo), the Essence tracker and spell costs, the mana
tracker, the constants lists of HoTs, Echoes and healing spells, and the core
Preparation section (core.md). The Dream Breath cooldown model also folds in
Nozdormu's Teachings (5 seconds off per Temporal Anomaly) and Temporal Burst
(1% extra recovery per stack of a decaying buff); both are hand-kept. An
unused efficiency-details module is dead code.

## Candidates left

None worth building. The audit is about damage, and this spec grades
healing quality. The nearest to damage, with low expected value:

- **Reversion, Dream Breath and Dream Flight uses as tracked cooldowns**:
  not a WoWAnalyzer damage rule; the app would need the cooldowns measured
  in `tracked-cooldowns.ts`, and Dream Breath's recharge has several
  reductions (the flat talent values, Nozdormu's Teachings per Temporal
  Anomaly, Temporal Burst), so `spentCooldownDrift`-style modelling would be
  needed. Value to the DPS review is nil (they are heals); for a healing
  review it would belong in `lib/mitigation/`, with the optimizer's
  mitigation view, not here. Expected value: very low.
- **Disintegrate spent from an Essence Burst**: WoWAnalyzer fails this unless
  Energy Loop is taken. If the user wants damage-minded Preservation play
  judged, a rule could value Essence Burst procs by what they healed against
  a Disintegrate; healer leniency and raid-damage dependence make a mistake
  indistinguishable from what top players do. Expected value: very low.

The heal-wasted-GCD check already in `healer.ts` is the app's whole
Preservation damage view. Phase 3 would need a Preservation case study first
(none exists), so every item here stays unmeasured.
