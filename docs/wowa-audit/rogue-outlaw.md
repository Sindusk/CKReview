# WoWAnalyzer audit: Outlaw Rogue

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Rogue shared layer,
  then the spec), spot-checked at their source lines (4 of
  4 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares 12.0.7 ("lagging", one patch behind the clone's
  12.1.0), flagged partly maintained; its own description says it covers
  the single-target rotation and major mistakes only. Last changelog entry
  2026-08-08 (reactivated for 12.0.7), before that 2025-04-17. The
  changelog is per spec, so every record's patch is 12.0.7; rules for
  talents that have changed since are noted as doubtful, not made
  candidates. **Most of what the spec defines is not shown:** no module
  calls a suggestion API and the checklist is gone, so the threshold
  getters for the idle-time override, Audacity, Opportunity, Dispatch and
  Roll the Bones uptime have no reader ("dead getter" below). What a user
  sees graded is the guide: the core downtime box, the energy-at-cap
  sentence, per-cast finisher and Adrenaline Rush combo-point checks, and
  colored cooldown bars. The two priority rotations are dead code (not in
  the parser's module list), so they are listed for completeness only.
- **App:** `lib/damage/wow/specs/melee.ts` (`"Outlaw Rogue"`: Adrenaline
  Rush window, main resource at the cap), generic checks, `potion.ts`.
  Nothing for Outlaw is in `tracked-cooldowns.ts`. No case study: the
  melee.ts header counts one Outlaw player in the survey ("fewer than 3:
  unverified"), so no status below is `verified`.
- **Phase 3:** not started.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Outlaw sets or
  adds. Rogue shared-layer rules that Outlaw uses (wasted combo points,
  wasted generator energy, regen lost at the cap, the finisher-share grade,
  instant poison) are folded in where Outlaw reads them.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| rogue-outlaw/AlwaysBeCasting/downtime-pct | superseded | `checkGcdGaps` | none | idle time | The spec widens the grade to 20 / 25 / 30% of the fight but under a name the core module does not read, so the live grade is the core 5 / 10 / 15%. Whole-fight denominator, forced time counted as idle (core.md). |
| rogue-outlaw/Finishers/recommended-points | candidate | — | Deeper and Devious Stratagem (raise the cap) | a finisher cast below cap minus one points | Floor is one under the combo-point cap (6 at a 7 cap). Feeds the two rules below; its own share grade (above 5 / 10 / 20% inefficient) is a dead getter. See the candidate note under FinisherUse. |
| rogue-outlaw/FinisherUse/cp-per-cast | candidate | — | Killing Spree, Coup de Grace; stratagem talents | a finisher spent at low points | Each spend of Dispatch, Between the Eyes, Slice and Dice, Kidney Shot, Killing Spree or Coup de Grace is good at the floor or above (Killing Spree one lower), otherwise fail. Live in the guide. Log-visible (spend events carry the points). Value would be a finisher's scaling lost per point under the floor, from the player's own finisher hits per point. The app has no combo-point check; `primaryResourceCapFindings` sees only energy. Separating a mistake from play: low-point Slice and Dice refreshes, Between the Eyes before a Vanish or on proc, Kidney Shot as a stun and dying targets are all deliberate, and the rule excuses none (Kidney Shot in the list is utility). Expected value low. |
| rogue-outlaw/BuilderUse/builder-at-high-cp | candidate | — | Hidden Opportunity, Audacity, Subterfuge, Echoing Reprimand, Ace Up Your Sleeve | a builder cast into banked combo points | Sinister Strike wasted above 5 points, Pistol Shot above 3, Ambush by proc and stealth conditions, other builders above the finisher floor. Display only (a donut), no grade. Log-visible. Value: the points lost to the cap times a point's worth, from the log's combo-point updates. It ignores bonus points from extra hits (Double Trouble and the like), so its limits are guesses; the cheap-utility builders (Shiv, Gouge, Cheap Shot) are counted wrongly. Expected value low. |
| rogue-outlaw/Guide/EnergyCapWaste/percent-at-cap | unverifiable | `primaryResourceCapFindings` (non-spending casts at the cap only) | Vigor | time sitting at max energy | Perfect 5%, good 10%, ok 15%, otherwise fail, over the whole fight. Regen lost at the cap is predicted, not logged (core.md); the 1.6x Adrenaline Rush regen in the model is hard-coded. Stasis and intermission time at cap count as waste. Pooling for a window is penalised. |
| rogue-outlaw/AdrenalineRush/cp-at-cast | candidate | — | Adrenaline Rush, Improved Adrenaline Rush | Adrenaline Rush cast with 3+ points banked | Good at 2 or fewer points before the cast, fail above, since the cast grants points that overcap. Per cast, no time denominator; a pre-pull cast has no earlier point data. Value would be the overcapped points. Separating a mistake from play: holding it for the points can cost a later window, which the rule ignores. Expected value very low. |
| rogue-outlaw/Abilities/adrenaline-rush-efficiency | covered | `burstGcdFindings` (Adrenaline Rush window); the cast itself see the candidate below | Adrenaline Rush; Restless Blades shortens its recharge | Adrenaline Rush held | 90% target on a 180s cooldown, whole-fight, with the expected last use even if the fight ends first and forced time counted as ready (core.md). The app judges the window it opens (GCDs that fit vs GCDs pressed) but not a held cooldown: see the candidate. |
| rogue-outlaw/Restless-Blades/adrenaline-rush-recharge | candidate | — | Restless Blades; Triple Threat, Supercharger | Adrenaline Rush (and Keep It Rolling, Killing Spree, Blade Rush) held past ready | Not tracked: Outlaw is absent from tracked-cooldowns.ts, and the shortest-interval method would invent drift because each finisher cuts the recharge. WoWAnalyzer models the cut as about one second per combo point spent on the finishers, scaled up while Triple Threat is up, with a larger credit for Coup de Grace and for the first spends after a Supercharger Adrenaline Rush (the exact multipliers are numbers from the spec and doubtful after 12.0.7). A `spentCooldownDrift` use needs a per-spend reduction, which the shared helper has only as a fixed amount per buff event or per resource unit spent: combo points are a spent resource, so the per-unit form fits for the base rule, while the multipliers and the Coup de Grace bonus would be a model, not log data. The pre-pull cast could read from the Adrenaline Rush buff (`prePullFromBuff`). Value: a held-late use of the window the app already prices (`valuePerUse` from the player's own damage in the window vs out). Premise check for phase 3: do top Outlaws hold it as long as weaker ones (pooling energy for a window is common). Expected value moderate, the best here, but it depends on whether combo-point spends are in the log. |
| rogue-outlaw/Guide/Cooldowns/cooldown-bars | covered | `checkCooldownDrift` where tracked; otherwise as above | Killing Spree, Blade Rush, Keep It Rolling, Preparation | skipped or late cooldowns | Colors the cast efficiency of five cooldowns; core default 80% (average −5, major −15 points) where the spellbook sets no target. Same whole-fight denominator and forced-time-as-ready error as every cast-efficiency rule (core.md). None of the five is tracked, so these have no app row today; Killing Spree's 180s with a 10% cut from Disorienting Strikes and Preparation's resets are other cooldown models the app would have to fit. |
| rogue-outlaw/Abilities/blade-rush-killing-spree-efficiency | wrong | — | Blade Rush, Killing Spree, Disorienting Strikes | skipped cooldowns | Efficiency at the core default, but its own advice text says to hold both to line up with Blade Flurry on several targets, which a flat efficiency target contradicts on cleave fights. Tier-set 4-piece cut hard-coded. |
| rogue-outlaw/RollTheBonesBuffs/uptime | candidate | — | none (Dragon Bone Dice changes only text) | Roll the Bones left down | Any Roll the Bones aura up, below 95 / 90 / 80% of the fight; a dead getter, the guide shows an ungraded bar. Log-visible. Whole-fight denominator, so forced time and Stasis count against the player; it also does not check which buffs rolled or if a re-roll was due (the model of rolls with their pandemic carry is a hand-kept tracker). The app has the buff-uptime machinery for DoTs (`dotUptimeFindings`) but no buff-uptime check. Value: the buffs' damage share from the player's own hits inside vs outside. Doubtful premise: the re-roll game (keep a good roll, reroll a bad one) is the real skill and uptime alone does not grade it. Expected value low. |
| rogue-outlaw/Audacity/builder-while-proc-up | candidate | — | Audacity | Sinister Strike or Pistol Shot pressed with an Audacity proc up | Share of such casts to all builder casts, above 1 / 5 / 10%; a dead getter. Log-visible (the buff is a buff event; an 800ms lookback guards a Pistol Shot that procs it). Value: the difference between Ambush and the builder cast, from the player's own Ambush vs Sinister Strike hits. Separating a mistake from play: stealth Ambush is free and a proc can be intentionally saved; top players may take a Sinister Strike for combo-point reasons. Expected value low. |
| rogue-outlaw/Opportunity/sinister-with-proc | candidate | — | Opportunity | Sinister Strike cast with Opportunity up | Share of Sinister Strike casts, above 0 / 5 / 10%; a dead getter. Log-visible. It ignores the Pistol Shot point limit in BuilderUse, so the two rules can disagree. Value: Pistol Shot vs Sinister Strike from the player's own hits. Expected value low. |
| rogue-outlaw/Dispatch/dispatch-while-bte-ready | unverifiable | — | Ace Up Your Sleeve, Gravedigger | Dispatch cast while Between the Eyes was ready | Share of Dispatch casts, above 0 / 10 / 20%; a dead getter. The cooldown model never starts Between the Eyes (its own comment says Crack Shot removes it in stealth) and the module is off unless Ace Up Your Sleeve is talented, so readiness is modelled, not logged. |
| rogue-outlaw/APL/hidden-opportunity-rotation | superseded | the spec checks | Hidden Opportunity, Subterfuge, Audacity, Coup de Grace | casts out of the priority order | Dead code, never enabled. Roll the Bones first, then Killing Spree and Coup de Grace and the two finishers at six-plus points (five with a proc or Subterfuge), then Ambush with Audacity or in stealth, Pistol Shot on Opportunity, Sinister Strike otherwise. The "fewer than 5 buffs" condition can never be false. Single-target. Judged through the per-rule rows above. |
| rogue-outlaw/APL/keep-it-rolling-rotation | superseded | the spec checks | Keep It Rolling, Subterfuge | casts out of the priority order | Dead code. Keep It Rolling when a strong roll is up, finishers at five-plus points, Pistol Shot on Opportunity at low points. Its Roll the Bones conditions join with the language's logical-or, which collapses to the first one (always true). Single-target. |
| rogue-outlaw/ComboPointDetails/wasted-cp | candidate | — | none | combo points lost to the cap | Waste above 5 / 10 / 20% of generated points. Pooled over all generators, so unavoidable bonus-point waste counts. See the BuilderUse note; value would be the same. Expected value low. |
| rogue-outlaw/EnergyDetails/wasted-generator-energy | covered | `primaryResourceCapFindings` | none | generator energy lost to a full bar | Waste above 5 / 10 / 20% of generator energy (event gains only). The app counts the casts made at the cap; passive regen lost is unverifiable (core.md). |
| rogue-outlaw/InstantPoison/proc-rate | no-damage | — | none | — | Poison hits per melee hit, below 20 / 15 / 10%. A luck measure; the ratio is not distorted by downtime but small samples are noisy. |
| rogue-outlaw/statistics | no-damage | — | — | — | Display only: Slice and Dice uptime, the Roll the Bones explanation and four-buff bar, Adrenaline Rush uptime bar and good-cast summary, energy and combo-point graphs, builder and finisher donuts, wasted-proc counts for Audacity and Opportunity, Echoing Reprimand points, Deeper Daggers uptime. |
| rogue-shared/utility | no-damage | — | — | — | Crimson Vial, Evasion, Feint, Cloak of Shadows, Shroud of Concealment, Vanish (also an opener), Blind, Kidney Shot, Sprint, Shadow Step, Grappling Hook, Tricks of the Trade, Thistle Tea, Between the Eyes and Blade Flurry readiness (not graded), Gouge, Kick, Distract, Arcane Torrent. Utility and defensives are not judged. |

Not rules (models the rules above rest on): the Outlaw combo-point tracker
(bonus points from Sinister Strike's extra hit), the energy-cap tracker (a
hard-coded Adrenaline Rush regen multiplier), the Roll the Bones cast
tracker (per-cast buff grouping, pandemic carry), the Between the Eyes
debuff timer, the custom cooldown model, the Restless Blades and
Preparation reductions and resets (the spec writes them into the event
stream), the cast-link and Fan the Hammer normalizers, the opportunity
refresh normalizer, the shared resource trackers and energy cost model,
the stealth helpers and filtered damage trackers, the Thistle Tea event
link.

## Candidates left

Ordered by expected value; none measured.

- **Restless-Blades/adrenaline-rush-recharge**: moderate. The only one
  that connects to a damage window the app already prices. Needs a check
  that combo-point spends are in the log and a premise check on top
  players; the multipliers are patch-dependent and doubtful after 12.0.7.
- **FinisherUse/cp-per-cast** (with Finishers/recommended-points): low.
  Needs an exception list (Slice and Dice, Kidney Shot, Vanish timing) to
  separate a mistake from deliberate play.
- **BuilderUse/builder-at-high-cp** (with ComboPointDetails/wasted-cp):
  low. Limits are guesses that ignore bonus points.
- **Audacity** and **Opportunity**: low, and proc-saving is deliberate
  play. Both were dead getters.
- **RollTheBonesBuffs/uptime**: low; the re-roll decision is the skill,
  not the uptime.
- **AdrenalineRush/cp-at-cast**: very low.

With one Outlaw player in the survey and no case study, every candidate's
premise check would need a fresh pair of logs first.
