# WoWAnalyzer audit: Fire Mage

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Mage shared layer,
  then the spec), spot-checked at their source lines (4 of
  4 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** lagging. Declares patch 12.0.7 while the clone's retail
  version is 12.1.0; fully maintained, last change 2026-05-24. No
  priority list and no checklist: every grade is a guide section, three
  cast-efficiency targets, or the active-time line. The Mage shared layer
  grades nothing (spellbook, a few cooldown-reset models, display
  statistics). Hero-talent and apex references were added in March 2026
  and are the likeliest to have moved since; rows that lean on talents
  that may have changed say "doubtful". The Pyrocosm module is dead code
  (never enabled), and the changelog says Searing Touch and Feel the Burn
  modules were removed while the 30% Scorch and 90% Firestarter crit
  logic remains inside the Hot Streak and Heating Up code.
- **App:** `lib/damage/wow/specs/ranged.ts` (`"Fire Mage"`: a Combustion
  window through `burstGcdFindings`; no resource check, since Mages log
  only mana), `tracked-cooldowns.ts` (Combustion, 60s, marked
  unverified: 2 players), `potion.ts`, generic checks. No case study:
  Fire has no entry in the ranged.ts header, and only 2 Fire players are
  in the samples.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Fire sets or
  adds.
- **Phase 3:** not started.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| mage-fire/AlwaysBeCasting/active-time | superseded | `checkGcdGaps` | none | idle time | Below 95 / 90 / 87.5% of the whole fight, so the major step is looser than the core's. Its own guide text admits forced downtime isn't accounted for. |
| mage-fire/CancelledCasts/cancelled-percentage | covered | `checkInterrupts` | none | a cast cut by movement or an interrupt | Takes the core's bands (above 2 / 5 / 15% of casts); Fire Blast, Combustion and Shimmer are excluded. Boss interrupts and stuns count as cancels. |
| mage-fire/Abilities/combustion-efficiency | covered | `checkCooldownDrift` (Combustion, 60s) | Combustion; Kindling | Combustion held | 90% target, whole-fight; WoWAnalyzer counts forced time as ready and expects a last use even when the fight ends first. The app tracks Combustion at 60s from the log (60.0 / 60.9s), which agrees with the 60s WoWAnalyzer assumes under Kindling. WoWAnalyzer's flat 60s is a model, and in-game Kindling is crit-driven, so its 60s may be too tight. Unverified in the app (2 players). |
| mage-fire/Abilities/fire-blast-efficiency | candidate | — | Fire Blast; Flame On; Fervent Flickering; Spellfire Salvo; Fiery Rush; Fired Up; From the Ashes; Spontaneous Combustion; Glorious Incandescence; Cold Snap | Fire Blast charges sat capped or unused | 90% target on two charge-based entries. Not tracked: with its charges and many reductions the recharge doesn't fit a fixed interval, and the reductions are server-side, never logged. WoWAnalyzer hand-models all of them, and as written its haste term appears to scale only the subtracted amount (a reading, not run), so its modelled cooldown is near-constant. Counts Stasis as ready. Value would be charges lost at the cap, from a modelled charge count (`spentCooldownDrift`-style, reducing on the Fired Up buff events and Glorious Incandescence removals, which are logged; From the Ashes and Spontaneous Combustion aren't). Expected value low: Fire Blast is mostly an off-GCD crit tool, and top players cap it freely when no Heating Up is there. Doubtful for 12.1.0 (apex and hero-tree reductions). |
| mage-fire/Guide/meteor-efficiency | candidate | — | Meteor; Blast Zone | Meteor held | A bar only, with the suggestion switched off. Not tracked: observed recharge spread is 53.9 / 68.7s, since Meteor is deliberately held to line up with Combustion. The spec's own text says so, so low efficiency is often intended. No reduction rule to model; Blast Zone only lowers the base. Value would be a held Meteor's damage per cast less forced time, but expected value near zero: the hold is the strategy. |
| mage-fire/HotStreak/expired-procs | candidate | — | none | a Hot Streak that ran out unspent | Counted against 0.5 / 1 a minute of the whole fight. Log-visible: the buff applied, then removed with no Pyroblast or Flamestrike cast. The app's `checkProcs` handles expiry of procs generally, but Hot Streak is not a registered proc for Fire (the spell data lists it as a class buff at ~49 a minute); whether it fires on a Fire pull is phase 3. Value: a lost Pyroblast, from the player's own Pyroblast average, less forced time and death. A high-value candidate by Fire standards; the per-minute allowance is the part not to copy. |
| mage-fire/HotStreak/wasted-crits | candidate | — | none | a crit from Fireball, Scorch or the like while Hot Streak is up | 0.5 / 1 a minute. Log-visible from the buff window plus the crit flag. Value would be the lost conversion of a Heating Up into the next Hot Streak, which is not directly in the log; an estimate would use the player's own proc rate. Doubtful: single-target crit on the cast target only, and a cast started before the proc is unavoidable. Likely fails phase 3 as the top players do it too. |
| mage-fire/HotStreak/per-proc-grade | wrong | — | Scorch execute; Firestarter; Combustion; Hyperthermia | a Pyroblast pressed with no precast and no guaranteed crit | Categorical grade per proc. Premise leans on removed talent logic (Searing Touch at 30%, Firestarter at 90%), and target health comes from the last damage snapshot, which can be stale. Doubtful for 12.1.0. Shows a preference (hardcast-first) rather than a loss the log can price. |
| mage-fire/HeatingUp/fire-blast-utilization | wrong | — | Scorch execute; Firestarter; Combustion; Hyperthermia | Fire Blast used to fish for a crit | 95 / 90 / 80% of Fire Blast casts. It records only casts that crit yet divides by all casts, so the share can read high, and it ignores charge-cap pressure that its own per-cast grade excuses. Doubtful for removed crit sources. |
| mage-fire/HeatingUp/converted-buffs | candidate | — | none | Heating Up lost before it became Hot Streak | 90 / 80 / 70% of procs. Log-visible, but a pre-pull Heating Up is counted on removal and not on apply, so the share can run high, and a short timer expires in forced downtime. Value: a lost conversion, priced from the player's own Pyroblast average. Expected value low; it largely restates the Hot Streak counts and active time. |
| mage-fire/HeatingUp/per-fire-blast-grade | wrong | — | Fervent Flickering; Flame On; Scorch; Firestarter; Combustion; Hyperthermia | Fire Blast pressed with no Heating Up and not near the charge cap | "Near cap" depends on the hand-modelled charge count, whose reductions are mostly invisible in the log, so the exemption can be wrong either way; the hard-coded 5 second window inherits it. |
| mage-fire/Combustion/active-time-per-cast | wrong | `checkGcdGaps` + `burstGcdFindings` (Combustion) | Combustion | idle inside Combustion | At or above 90 / 80 / 70% of the buff window, per use. The same idle the gap check counts, graded a second time; forced time inside the window counts as inactive. A cut-off window at fight end may read 0 and fail. The app values the missing GCDs at the window's bonus, less forced time. |
| mage-fire/Combustion/hardcast-fireball | candidate | — | Combustion; Frostfire Bolt (hero tree) | a Fireball hardcast inside Combustion | Any one fails the use. Log-visible: a Fireball cast whose begin falls in the buff. Value: the difference per cast between Fireball and the instant spender or filler the player would otherwise cast, from the same player's damage per cast inside the window. Doubtful: Frostfire Bolt replaces Fireball in the hero tree and is not checked; the guide text also names Pyroblast and Flamestrike hardcasts, which aren't checked. Phase 3 must find a hardcast that top players don't make (movement with no Scorch, last cast before the buff ends). |
| mage-fire/Combustion/precast-delay | candidate | — | Combustion | Combustion pressed too early in the hardcast, or without one | 0.7 / 1.0 / 1.5 seconds. Log-visible. In the code order the delay only demotes a use that scores well on active time, and the "no precast found" marker doesn't change the grade. The value is small seconds of lost buff alignment: separate a mistake from top players by the gap distribution first. Expected value low. |
| mage-fire/Meteor/per-cast-grade | wrong | — | Meteor; Burnout; Blast Zone | Meteor cast outside Combustion, or into nothing | Fail if it hit no targets or (without Blast Zone) missed Combustion; perfect within 8 seconds of Combustion ending (Burnout); good outside it with over 20 seconds to the next. The next-Combustion time comes from a hand-kept cooldown model with the Kindling assumption, landing time from the first damage event, and the "hit no targets" case fires in target-less phases. Burnout and Blast Zone may have moved after 12.0.7: doubtful. |
| mage-fire/HeatShimmer/per-proc-grade | candidate | — | Heat Shimmer | a Heat Shimmer overwritten or left to expire | Categorical: refreshed or expired is a fail, spent on a Scorch is good. Log-visible. The spec changelog records two Heat Shimmer fixes in April 2026, so the detection was shaky. Value: a lost instant Scorch, priced from the player's Scorch average. Doubtful for 12.1.0 (the text assumes Scorch under 30% health). Expected value low. |
| mage-fire/HeatShimmer/expired-and-overwritten-counts | superseded | — | Heat Shimmer | — | The counts of the per-proc grade above, as per-minute allowances (expired 0.3 / 0.6, overwritten 0.5 / 1) of the whole fight. Stasis time counts. |
| mage-fire/statistics | no-damage | — | various | — | Display only: Combustion table of spells cast and share, Heating Up Fire Blast counts, Hot Streak average uptime and Pyroblast / Flamestrike split, Heat Shimmer average uptime, Fevered Incantation bonus and uptime, Hyperthermia procs (gated on the wrong talent, a stale name), From the Ashes seconds saved, Combustion damage throughput, Arcane Intellect uptime, barrier absorb. |
| mage-shared/utility-defensives | no-damage | — | — | — | Ice Block and Ice Cold (a damage-taken timeline, no grade), Blazing Barrier, Shimmer / Blink, Counterspell, Frost Nova, Ring of Frost, Alter Time, invisibility, polymorph. Utility and defensives aren't judged. Time Warp (5 min) is a raid cooldown, not a damage check. |

Not rules (models the rules above rest on): the event-order normalizers
(Combustion cast before its buff, Hot Streak before Heating Up removal,
Flamestrike before Hot Streak removal, Hot Streak removal before Scorch
damage), the cast-link normalizer (begin casts to casts, casts to damage,
spenders to Hot Streak removal), the per-Combustion, Hot Streak, Heating
Up, Meteor and Heat Shimmer record models, the spell-crit-source ordering
shared by the Hot Streak and Heating Up code, and the Fire Blast
cooldown-reduction models (Fired Up, From the Ashes, Spontaneous
Combustion, Glorious Incandescence, Flame and Frost). Spontaneous
Combustion's listener hangs on every cast, which looks like a bug. Spell
and constant tables: table, not extracted.

## Candidates left

Ordered by expected value. All unmeasured, and most will fail phase 3.

1. **Hot Streak expiry**: the loss the log shows most plainly (a proc
   removed with no Pyroblast or Flamestrike). Value as lost spender
   damage; check first that `checkProcs` already sees Hot Streak on a Fire
   pull, and that the top players expire none.
2. **Hardcast Fireball (or Frostfire Bolt) in Combustion**: priced from
   the player's own per-cast damage inside the window; separate the
   mistake from movement casts top players make.
3. **Heating Up conversions lost**: restates the Hot Streak count
   largely; low value.
4. **Fire Blast charges lost at the cap**: needs a reduction model the
   log can only half feed, and top players cap freely.
5. **Heat Shimmer wasted**, **Combustion precast delay**, **wasted crits
   under Hot Streak**: small, doubtful for the current talents.
6. **Meteor held**: the hold is deliberate; near-zero value.
