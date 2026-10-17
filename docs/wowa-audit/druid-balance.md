# WoWAnalyzer audit: Balance Druid

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Druid shared layer,
  then the spec), spot-checked at their source lines (3 of
  3 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** **lagging.** Declares patch 12.0.1 while the clone's retail is
  12.1.0; support level "Foundation", not maintained, and the guide itself
  warns that Apex talents aren't implemented. Two code comments cite
  12.0.5, so the code is a little newer than the flag. Last change
  2026-08-09 (Eclipse timeline); the core rotation rework is 2026-03-18 and
  the Moonfire / Sunfire section rework 2026-05-10. Rules that depend on a
  talent that has since changed (Lunar Calling, Whirling Stars as a second
  charge) are marked doubtful, not made candidates. The spec's own
  active-time (90 / 85 / 80%) and cancelled-cast (5 / 7.5 / 10%) getters
  appear to have no reader, so the guide uses core's steps.
- **App:** `lib/damage/wow/specs/ranged.ts` (`"Balance Druid"`: the
  Incarnation window, Astral Power at the cap, Moonfire and Sunfire uptime,
  `spenderOutsideEclipse`), `potion.ts`, generic checks. No Balance
  cooldown is in `tracked-cooldowns.ts`. Case study: qpZx3mWaG7gcDdYB pull
  3 (Sylmigron, 6th percentile) against dBxtMyAc1zYHXQnK fight 18 (Kadss,
  100th); the header of ranged.ts records what matched.
- **Phase 3:** not started.
- **Core rules** (active time, cast efficiency, potions, cancelled casts,
  early DoT refresh) are in [core.md](core.md); rows below cover only what
  Balance sets or adds. The class layer is a single Innervate efficiency
  grade plus cooldown models (below).

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| druid-balance/Guide/active-time | superseded | `checkGcdGaps` | none | idle time | Graded perfect at no downtime, then up to 5 / 10% of the whole fight. Whole-fight denominator with forced downtime counted as idle. Case study: 80.4% vs 94.0%, which the app shows as small delays and gaps. |
| druid-balance/Guide/cancelled-casts | covered | `checkInterrupts` | none | Wrath or Starfire cut by movement, a stun or an interrupt | Share of cast-time casts cancelled, up to 1 / 2 / 5%. Counts boss interrupts and stuns too. Case study 22.7% vs 5.8% (22 Starfires), their time counted in the gaps. |
| druid-balance/AlwaysBeCasting and CancelledCasts/spec-threshold-override | no-damage | — | none | — | Spec-level thresholds with no reader found; dead configuration, not rules. Recheck only if a later phase finds a consumer. |
| druid-balance/AstralPowerTracker/waste | verified | `primaryResourceCapFindings` | none | Astral Power generated into a full bar | Wasted share of generated Astral Power, 0 / 5 / 15% steps. Case study 5.0% vs 4.4%, matched. Rate gains are excluded from WoWAnalyzer's waste. |
| druid-balance/DotUptimes/moonfire-uptime, sunfire-uptime | verified | `dotUptimeFindings` (Moonfire, Sunfire) | Aetherial Kindling (tracker model only) | a DoT left off | 95 / 90 / 85% of the whole fight, pooled over targets, so cleave coverage is unscored. Case study 99% on both, matched. The app measures from first application less forced time; WoWAnalyzer counts forced downtime as DoT downtime. Its tracker hard-codes 18s. |
| druid-balance/DotUptimes/moonfire-useful-casts, sunfire-useful-casts | candidate | — | Dream Surge (Keeper of the Grove) | a DoT refreshed with more than 30% of its duration left | The core pandemic rule (core.md) in a per-cast rating: perfect with no overwrites, fail with only overwrites, useful share 90 / 80 / 70%. Burst windows are exempt in a hard-coded way (an overwrite within 3s before a Celestial Alignment, Incarnation or, for Keeper, Eclipse cast). Value: the duration past the 30% carry-over, per refresh, converted at the DoT's damage per second from the log, not a share of casts. Mistake vs top players: Elemental's Flame Shock equivalent failed phase 3 because top players refresh early to fit movement and swaps, so expect the same for Moonfire; separate only refreshes with no Eclipse, Incarnation or target swap near. Probably fails; low expected value. |
| druid-balance/EarlyDotRefreshesInstants/spec-thresholds | superseded | — | none | — | Still enabled but nothing reads it; the 2026-05-10 rework replaced it. Its Moonfire duration (22s) contradicts the live tracker's 18s. |
| druid-balance/FillerUsage/starfire-in-solar | candidate | — | none | Starfire cast in Solar Eclipse alone | Any such cast is "bad", shown as a bar, no grade. Doubtful: a Starfire used on purpose to build the next Eclipse is not excluded. Value: the cast's damage against the player's own Wrath average in Solar, from the log. Mistake vs top: top Balance players mix this in, so the premise needs a measurement on top logs first. Low expected value. |
| druid-balance/FillerUsage/starfire-too-few-targets | candidate | — | Lunar Calling turns the check off | Starfire into fewer than 3 targets in Lunar Eclipse (4 with both Eclipses) | A cleave-versus-single-target test: the target count is guessed from the player's own hits and the numbers are marked untuned by WoWAnalyzer. Doubtful after the talent changes. Value: Starfire damage against the same player's Wrath in that Eclipse. Mistake vs top: on a single-target boss the top players use Wrath; separate by the target count from boss and add presence. Single-target priority is the user's leniency area, so build only if a cleave kill shows it. Low. |
| druid-balance/FillerUsage/lunar-calling-starfire-out-of-eclipse | wrong | — | Lunar Calling | Starfire outside an Eclipse with Lunar Calling | The cast is annotated but the counter that feeds the bar is never incremented, so the rule never shows. Doubtful for 12.1 anyway. |
| druid-balance/FillerUsage/wrath-in-lunar | no-damage | — | none | Wrath in Lunar Eclipse alone | An "ok" filler bar with no grade; display only. Doubtful with Lunar Calling, which makes Wrath in Lunar legitimate. |
| druid-balance/SpenderUsage/spender-outside-eclipse | verified | `spenderOutsideEclipse` (ranged.ts) | none | Starsurge or Starfall cast with no Eclipse up and Astral Power not near the cap | WoWAnalyzer's near-cap line is a placeholder at 80; the app uses 20 Astral Power below the max. Case study 28 vs 4 (WoWAnalyzer) and 26 vs 4 (app, 1.69M vs 0.28M); other strong Balance players 5-9. Movement spenders aren't exempted by WoWAnalyzer. The app values each by the player's own inside minus outside average (inference). |
| druid-balance/SpenderUsage/starfall-too-few-targets | wrong | — | none | Starfall hitting fewer than 3 targets | Scores single-target Starfall as a failure by design, and the target set isn't cleared between casts so later casts look better than they were. Single-target priority is the user's leniency area. |
| druid-balance/SpenderUsage/spenders-per-eclipse | wrong | `spenderOutsideEclipse` | CA or Incarnation windows merged in | an Eclipse window with fewer than 4 spenders | Flat count per window (4+ green, 3 yellow, else red), a marked placeholder, with no allowance for window length, forced time or movement; a merged window is graded as one. The count is the inverse of the outside-Eclipse spenders the app already prices, and a low count mostly reflects capping, which the cap check holds. |
| druid-balance/CelestialAlignment/active-time-per-cast | wrong | `burstGcdFindings` (Incarnation window) + `checkGcdGaps` | Celestial Alignment, Incarnation: Chosen of Elune, Orbital Strike, Whirling Stars | idle inside a cooldown window | Active time during each 15s (20s Incarnation) window, 95 / 90 / 80%. Grades the idle `checkGcdGaps` already counts, with forced downtime counted as inactive; the app values the missing GCDs at the window's bonus less forced time. The durations are hard-coded. |
| druid-balance/Abilities/ca-incarnation-efficiency | candidate | — | Whirling Stars, Orbital Strike (-60s each from a 180s base) | Celestial Alignment or Incarnation held | 90% target, whole-fight; Stasis counts as ready. Not tracked: the header of tracked-cooldowns.ts leaves Incarnation out (spread 20.8 / 104.7s), the case study read Incarnation at 100%. The reductions are static talent subtractions, so a fixed cooldown can be fitted per player and `checkCooldownDrift` might take it with the talent read; Whirling Stars as a second charge is doubtful. Value: lost uses times the window's gain, from the log. Mistake vs top: hold for a boss mechanic or Eclipse alignment is normal (the guide says so), so separate forced-time holds first. Control of the Dream's 15s grace is another source of drift. Moderate chance of failing. |
| druid-balance/Abilities/fury-of-elune-efficiency | candidate | — | Radiant Moonlight (-15s on 60s); Lunation (-2s per arcane cast) | Fury of Elune held | 90% target; Stasis as ready. Not tracked (19.7 / 25.9s spread). A candidate for `spentCooldownDrift`: Lunation's reduction is a fixed per-cast value taken `reduceOn` the arcane casts, and the base is 60s or 45s. Case study: 66% vs 73%, holds mostly Stasis, so the hold is forced time. Value: each lost use at its damage from the log. Mistake vs top: expect holds for adds or phases; low-medium. |
| druid-balance/Abilities/new-moon-efficiency | candidate | — | New Moon; Lunation (-1s per arcane cast) | Moon charges capped (3 charges, 20s) | 90% target; the extra tip says to avoid sitting at 3 charges. Charge-based, so the cap-time form (`cappedStretches`) is a better fit than drift; Lunation's per-cast reduction cuts the recharge, the same shape as Fury of Elune. Value: Moon casts lost to capped stretches, at the player's own Moon average. Mistake vs top: small, since a Moon is a few GCDs of builder; low. |
| druid-balance/Abilities/force-of-nature-efficiency | candidate | — | Early Spring (-15s on 60s); Control of the Dream | Force of Nature held | 90% target; Stasis as ready. Not tracked, and tracked-cooldowns.ts doesn't record why. Treants' damage is credited to the owner, so value from the log directly; Control of the Dream (Keeper only) rewrites the cooldown, so a fixed model fits only without it. Mistake vs top: aligning with Eclipse or Incarnation is normal; low. |
| druid-balance/Abilities/convoke-efficiency | candidate | — | Elune's Guidance (60s instead of 120s); Control of the Dream | Convoke the Spirits held | No spec target, so core's default (80%) applies. The cooldown depends on the talent; Feral's Convoke is tracked at ~61s in tracked-cooldowns.ts, so the Balance 60s variant could join that mechanism. Value from the log: the convoked damage is credited to Convoke itself. Mistake vs top: low value unless a case study shows it. |
| druid-balance/Abilities/wild-mushroom-efficiency | no-damage | — | none | unused mushroom charges | 90 / 75 / 60% target, but the text itself calls capped charges fine in single target, so the grade can contradict itself. Damage matters only in AoE; nothing to price in single target. |
| druid-balance/Eclipse/cast-on-cooldown | candidate | — | Eclipse; Improved Eclipse (2 charges); Sculpt the Stars; Lunar Calling | Eclipse left unused or the wrong Eclipse chosen | Prose only: cast Eclipse on cooldown, Lunar for 3+ stacked targets and Solar for 1-2. No efficiency target is set, so nothing grades it. Value: Eclipse uptime lost to idle charges, but the case study didn't adopt Eclipse uptime (53% vs 69%) because the spenders outside Eclipse already carried most of it. Mistake vs top: low; likely already inside `spenderOutsideEclipse`. |
| druid-balance/OffensiveTimeline/cooldown-priority-prose | no-damage | — | Celestial Alignment, Eclipse | — | Prose and charts: never let Eclipse or Celestial Alignment sit full, line up with the short cooldowns, holding for mechanics is fine. Useful as a reference for an Eclipse / Incarnation alignment check; no grade. |
| druid-balance/Starlord/max-stack-uptime | no-damage | — | Starlord | — | Display only (active uptime, max-stack uptime, average stacks). Case study not adopted: 52% vs 63% at 3 stacks, which the spenders outside Eclipse carry. |
| druid-balance/statistics | no-damage | — | various | — | Display only: Eclipse uptime bar and timeline, DoT uptime multi-bar, Soul of the Forest and Sundered Firmament Astral Power and damage share, Twin Moons share, Starweaver free-spender counts, Convoke damage share, cooldown throughput in the window, the offensive timeline, Astral Power graph. Dead code: Touch the Cosmos is not enabled. |
| druid-shared/utility and defensives | no-damage | — | — | — | Barkskin, Stampeding Roar, Wild Charge, Heart of the Wild, crowd control and the rest; only Innervate is graded (80% target, mana for healers), which doesn't touch damage. Utility and defensives aren't judged. |

Not rules (models the rules above rest on): the cast-link normalizer
(Starfire damage and gains, Moonfire / Sunfire debuff events, mushroom
casts), the per-target DoT history with its 30% carry-over window and its
literal 18s durations, the Astral Power tracker (values scaled by 10), the
Celestial Alignment / Incarnation haste model, the Eclipse state helpers,
the aura list for the timeline, the spellbook declarations, the class-layer
Control of the Dream and Lunation cooldown models (they alter every
cooldown-efficiency figure above when taken), the Convoke damage
attribution and the form tracker.

## Candidates left

Ordered by expected value; none is measured, and most candidates fail
phase 3.

1. **Fury of Elune with Lunation** (`spentCooldownDrift`): the one
   cooldown whose tracked-cooldowns.ts omission has a talent-driven
   reduction the spec models; the case study found its holds were Stasis,
   so expect little.
2. **Celestial Alignment / Incarnation drift**: biggest single cooldown,
   but the case study read Incarnation at 100% and holds are often for
   mechanics.
3. **Moonfire / Sunfire early refresh**: priced by duration lost; likely to
   fail as Elemental's Flame Shock did.
4. **Force of Nature, Convoke, Moon charges**: low.
5. **Starfire target count and Starfire in Solar**: cleave and filler
   judgements; low, single-target leniency.
6. **Eclipse on cooldown**: probably already inside `spenderOutsideEclipse`.
