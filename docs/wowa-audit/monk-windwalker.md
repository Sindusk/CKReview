# WoWAnalyzer audit: Windwalker Monk

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Monk shared layer,
  then the spec), spot-checked at their source lines (3 of
  3 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares 12.1.0, maintained only partially; last change
  2026-09-25 (Shado-Pan single-target priority update). Nearly all of the
  grading lives in the guide, and much of it is qualitative or display-only.
  The spec sets thresholds on Always Be Casting, Combo Strikes, Combo
  Breaker, Fists of Fury, Blackout Kick, Xuen's Battlegear, Hit Combo, Touch
  of Karma and chi waste, but **nothing in this clone reads those getters**:
  they are dead thresholds, so the rows below record the rule and not a
  tier. The live grades are the cast-efficiency bars, the proc and
  Heart of the Jade Serpent window boxes, the Celestial Conduit channel box
  and the priority-list check. Hero tree is inferred, not read: a player
  with Celestial Conduit is checked against the Conduit of the Celestials
  list, everyone else against the Shado-Pan list.
- **App:** `lib/damage/wow/specs/melee.ts` (`"Windwalker Monk"`: the Invoke
  Xuen window through `burstGcdFindings`, plus the main resource at the cap
  through `primaryResourceCapFindings`), `tracked-cooldowns.ts` (Invoke Xuen
  90s, Celestial Conduit 90s), `potion.ts`, generic checks. Case study:
  qpZx3mWaG7gcDdYB pull 3 (Blkphnx, 14th percentile) against
  ACmXHMFtaPLR9k8w (Styphi, 99th), both pages saved; the header of melee.ts
  and docs/damage-case-studies/qpZx3mWaG7gcDdYB.md record what matched. The
  one open item is Fists of Fury cadence (below).
- **Phase 3:** not started.
- **Core rules** (active time, cast efficiency, potions, cancelled casts,
  the priority-list checker) are in [core.md](core.md); rows below cover
  only what Windwalker sets or adds. The Monk shared layer (Celestial
  Conduit, Touch of Death) is judged here, since no Monk class ledger exists.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| monk-windwalker/AlwaysBeCasting/downtime | superseded | `checkGcdGaps` | none | idle time | The spec's 20 / 30 / 40% override sits on a property core never reads, and the guide has no downtime panel, so nothing is shown. Whole-fight denominator, forced time included. The app fits the player's real GCD (a fixed 1.0s for Windwalker) and values the gaps. Case study: 39.6 vs 47.9 GCDs a minute, counted as gaps and delays. |
| monk-windwalker/Abilities/invoke-xuen-efficiency | verified | `checkCooldownDrift` (Invoke Xuen, 90s) + `burstGcdFindings` window | Xuen's Bond (120 → 90s) | Invoke Xuen held | 95% target, whole-fight; registered only when Celestial Conduit is also taken. Case study matched on both players (100%). WoWAnalyzer counts forced time as ready; the app counts whole lost uses less forced time. The window's GCD fill is valued separately. |
| monk-windwalker/Abilities/celestial-conduit-efficiency | covered | `checkCooldownDrift` (Celestial Conduit, 90s) | Celestial Conduit | Celestial Conduit held | 95% target. The case study found the cooldowns fine on both players. Same forced-time overstatement as above. |
| monk-windwalker/Abilities/zenith-efficiency | candidate | — | Zenith; Efficient Training (−10s), Spiritual Focus (−20s) | Zenith charge held | 95% target, 90s base with two charges. Not tracked: two charges, and the survey interval spread is 17.6s shortest against an 83.9s median (tracked-cooldowns.ts). The case study did match WoWAnalyzer's 100% for both players by eye, but no app check produced it. Build as a charge-aware drift check with the two talent reductions read from CombatantInfo; Zenith's value is its buff window (the statuses stream has it). Low expected value: both case-study players used it fully. |
| monk-windwalker/Abilities/fists-of-fury-efficiency | candidate | — | none in the bar; Blackout Kick, Zenith, Xuen's Battlegear and haste change the real recharge | Fists of Fury held while ready | 90% target, 24s divided by haste. The only measured gap on this spec: Blkphnx 65% vs Styphi 84%, 4.4 vs 7.2 casts per unforced minute, the unforced interval median 12.9s vs 7.7s. Not built because the reductions are server-side. WoWAnalyzer rebuilds them from casts (Blackout Kick, 1s each, more in Zenith) and crit hits (Xuen's Battlegear: 4s per crit from the listed kicks, 0.5s per target from Spinning Crane Kick, capped 2.5s), but the app's own attempt on Blkphnx's full buff stream still left the fastest Fists 3-4.4s apart, for Styphi too. `spentCooldownDrift` takes a fixed reduction per buff event (`reduceOn`), a pre-pull cast from the window buff and a per-use value, so it fits only part of this: Blackout Kick is a cast with a variable reduction and the crit reductions are damage events, so the helper would need extending. Value from the log: ready-but-unpressed time ÷ the player's own recharge × the average Fists damage less the filler it displaced (the case study's rough figure: ~2M for Blkphnx). Separating a mistake from top play: Styphi's cadence, but haste and reset luck differ between players. Phase 3 must first show the rebuilt ready times agree with the top players' casts. |
| monk-windwalker/Abilities/rising-sun-kick-efficiency | candidate | — | Zenith (resets it), Teachings of the Monastery, Blackout Kick (−1s) | Rising Sun Kick held | No explicit target (core default). Same reduction model as Fists of Fury, so the same build serves both; the resets are inferred by WoWAnalyzer from the Teachings buff being consumed. Case study: 5.9 vs 7.9 casts a minute against the reference, Blackout Kick filler 10.3 vs 8.1. Lower value than Fists alone. |
| monk-windwalker/Abilities/whirling-dragon-punch-efficiency | candidate | — | Communion with Wind (−5s) | Whirling Dragon Punch held | 85% target, 35s less the talent. Not tracked: the 10 survey players show 16.5s shortest against a 29.9s median. The talent reduction is fixed, so a plain drift check fits once the talent is read from CombatantInfo; the spread suggests more than the talent is at work. Not measured. Low value (Fists and Rising Sun Kick gate it too). |
| monk-windwalker/Abilities/strike-slicing-winds-chi-burst | candidate | — | Strike of the Windlord, Slicing Winds, Chi Burst | held | 95% for Strike of the Windlord (35s, less the Communion talent) and Slicing Winds (30s), core default for Chi Burst (30s). None of the 10 survey players cast any of the three, so nothing has been seen to judge. No expected value until a log with them turns up. |
| monk-windwalker/Abilities/expel-harm | no-damage | — | Combat Wisdom | — | Core default efficiency on a heal; turned off by Combat Wisdom. |
| monk-windwalker/TouchOfKarma/efficiency-and-absorb | no-damage | — | none | — | 60% cast-efficiency target plus a statistic for the share of the absorb used. A defensive; the guide notes its use varies by encounter. Case study: 1 cast vs 3, not adopted. |
| monk-windwalker/Core/utility-and-defensives | no-damage | — | Chi Torpedo, Celerity | — | Roll, Chi Torpedo, Fortifying Brew, Diffuse Magic and the rest of the spellbook: no efficiency target at all. Utility and defensives aren't judged. |
| monk-windwalker/Core/guide-sections-and-advice | no-damage | — | — | — | Section layout and the prose advice (spend resources without starving the next big button; keep a Zenith charge for the Xuen-into-Conduit burst; delay Strike of the Windlord or Whirling Dragon Punch if burst starts within about 10 seconds; stagger Heart of the Jade Serpent sources). The guide itself says deliberate deviations can't be detected. Only the Whirling Dragon Punch half is in a priority list. |
| monk-windwalker/APL/selection | superseded | the spec checks | Celestial Conduit | — | Picks the list from one talent; the module returns no suggestions of its own, only the annotated timeline and the guide's priority section. A player on another hero tree who also takes Celestial Conduit gets the wrong list. The core priority rule (core.md) is superseded the same way. |
| monk-windwalker/APL/cooldown-and-ready-order | candidate | — | Whirling Dragon Punch, Strike of the Windlord, Zenith, Tigereye Brew | a lower rule cast while a ready cooldown applied | The ordered rules that put ready cooldowns first: Fists of Fury, Rising Sun Kick, Whirling Dragon Punch inside its grace period and when usable, Strike of the Windlord, Zenith Stomp while granted casts remain, and a Tiger Palm before Fists when chi would block it. Conduit list adds Celestial Conduit when no Heart of the Jade Serpent buff is up, and Whirling Dragon Punch held while Xuen is within 10s. These are the same loss as the efficiency rows above seen cast by cast, and they rest on the same modelled readiness, so they ride on the Fists build. The 10s Xuen window is a hard-coded plan choice. |
| monk-windwalker/APL/energy-cap-tiger-palm | unverifiable | — | Ascension, Inner Peace | Tiger Palm cast near the energy cap | A Tiger Palm rule at 85% of the energy cap (100, +20 and +30 with the two talents), skipped in Zenith or Bloodlust. Energy regenerates and spenders cost it, so the log shows only non-spending casts made at the cap (core: regen-cap, unverifiable). Same for the energy-capped time statistic. |
| monk-windwalker/APL/filler-and-chi-order | wrong | — | Obsidian Spiral, Dance of Chi-Ji | a filler cast out of list order | The low rules: Blackout Kick or Spinning Crane Kick during Zenith, Tiger Palm at one chi or less, Blackout Kick with Combo Breaker, Spinning Crane Kick with Dance of Chi-Ji, Slicing Winds, Tiger Palm at four chi or less, Blackout Kick as the last resort. Both lists have no target-count condition, so a cleave fight is scored as single target (Spinning Crane Kick placement above all); out-of-range and pre-pull casts are ignored; a rule that applied during a forced gap reads as missed. The part with a measured gap is the Rising Sun Kick vs Blackout Kick split (candidate rows above). Touch of Death is listed but never flagged. |
| monk-windwalker/ComboStrikes/mastery-breaks | candidate | — | Hit Combo | a mastery spell cast twice in a row | Includes the no-repeat condition hidden in every list rule and the Combo Strikes count (3 breaks vs 0 in the case study, not adopted). Log-visible from cast order. A break costs the mastery bonus on one cast, so the value is small per break: cast damage × the player's mastery share (stats are kept in CombatantInfo). Hit Combo is the same events as a stack-weighted uptime (the damage statistic and graph), a display of this row. A repeat forced by a mechanic still counts in WoWAnalyzer, so the app would need the forced windows. Low value. |
| monk-windwalker/HitCombo/weighted-uptime | superseded | — | Hit Combo | stack drops | Stack-weighted uptime over the whole fight, shown with a graph and the damage it added. Drops come from repeating a spell, so it restates the row above, and the denominator includes idle and forced time. |
| monk-windwalker/ComboBreaker/proc-windows | covered | `checkProcs` (expiries) | Combo Breaker or Sequenced Strikes | a proc left to expire | Each proc is a window: lost or overcapped fails, the rest graded by whether Blackout Kick was spent when the list wanted it. Only the expiry is a real loss; the spend timing is a priority choice, and the case study found proc grades similar between the two players. A gain while holding two stacks may not show in the log. Whether `checkProcs` sees Combo Breaker on a Windwalker pull is not measured (phase 3). |
| monk-windwalker/DanceOfChiJi/proc-windows | covered | `checkProcs` (expiries) | Dance of Chi-Ji | a proc left to expire | The same window grading against Spinning Crane Kick. The extra "damage gained" is an assumed doubling of the empowered kick, a hard-coded modifier. Spend timing on a cleave fight is scored as single target. Not measured. |
| monk-windwalker/RushingWindKick/proc-windows | covered | `checkProcs` (expiries) | Rushing Wind Kick | a proc left to expire | One-stack cap, so a second gain while one is held is an overcap fail in WoWAnalyzer; the log may not show that. Only expiry is checked by the app. Not measured. |
| monk-windwalker/ComboBreaker/risky-tiger-palm-and-utilization | no-damage | — | Combo Breaker | — | A count of Tiger Palms cast at two stacks (no grade) and the share of procs used (dormant tiers 90 / 80 / 70%). Display only; the loss is the expiry in the proc-windows row. |
| monk-windwalker/HeartOfTheJadeSerpent/window-quality | candidate | — | Heart of the Jade Serpent (Conduit of the Celestials), Unity Within | a window with no Fists of Fury, or a Strike of the Windlord or Unity Within cast inside it | Zero mistakes perfect, one ok, two or more fail. The buff and the casts are visible; the real loss is the cooldown speed-up wasted, a modelled quantity the log doesn't show, and a window without Fists may simply have had Fists on cooldown. Valued from the log, only the clear mistake (a restarting cast inside the window) could be priced: the seconds of speed-up cut ÷ the player's cadence × a Fists. Top players decide this, and nothing here is measured. Low value. |
| monk-windwalker/CelestialConduit/channel-complete | candidate | — | Celestial Conduit, Conduit of the Celestials | a channel cut short | Cancelled when the real length is more than 100ms under the 4s base shortened by haste; the channel is rebuilt from buff events. The Windwalker guide grades only perfect or fail. Value: pulses lost × the player's own average pulse damage (the Conduit's per-target bonus applies to the rest). A boss-forced stop reads as player error unless the app's forced windows exclude it. Low expected value: a deliberate cancel is rare, and the case study had 5 of 5 for both players. |
| monk-windwalker/CelestialConduit/unity-cooldowns-ready | unverifiable | — | Unity Within | Unity Within cast with a listed cooldown ready | Wants Rising Sun Kick, Fists of Fury, Strike of the Windlord and Whirling Dragon Punch on cooldown when Unity Within lands. The readiness is a modelled cooldown, not in the log, and forced time counts as ready. |
| monk-windwalker/CelestialConduit/targets-hit | wrong | — | Conduit of the Celestials | few targets per pulse | 5 or more good, 4 ok, fewer fail. Counts heal pulses only, so for a damage dealer it reads allies healed, not enemies hit, and a single-target fight always fails. It is hidden in the Windwalker guide anyway. |
| monk-windwalker/CelestialConduit/cast-rating | superseded | — | Conduit of the Celestials | — | The average of the three marks (channel, cooldowns, targets) in the shared helper; the cooldown part carries four marks against one each for the others. Windwalker's guide shows only the channel mark. |
| monk-windwalker/FistsOfFury/clip | candidate | — | Crashing Fists, Momentum Boost | Fists of Fury cut off by another cast | Counts the ticks landed out of five and names the cutting spell; the average-tick tiers (4.75 / 4.5) are dormant. Tick count is inferred from damage events with a 200ms grouping, so a target dying mid-channel lowers it. Value from the log: ticks lost × the player's average tick (late ticks are worth more with Momentum Boost). A movement or boss-forced cancel is forced time. Medium-low expected value; a lost tick is cheap to value,; whether top players clip on purpose is not known and is the phase 3 premise check. |
| monk-windwalker/Zenith/stomp-and-window | candidate | — | Zenith, Tigereye Brew, Obsidian Spiral, Drinking Horn Cover | granted Zenith Stomp casts left unused | Counts Blackout Kicks and Zenith Stomps in the window, the chi Obsidian Spiral gave, and the extra Stomp casts the Tigereye Brew talent granted that were not used. No grade. The Zenith buff is in the stream (44% of snapshots), the cast count is visible; the Zenith length is modelled (20s, 25s with the cap item) and the guide's own text says 15s. Value: unused casts × the average Zenith Stomp (20 casts across the 10 survey players, so thin). Low. |
| monk-windwalker/Cooldown-reduction-statistics | unverifiable | — | Teachings of the Monastery, Xuen's Battlegear | — | Blackout Kick and Xuen's Battlegear wasted reduction (seconds reduced while the target was already ready), each with dormant tiers. Both rest on a modelled cooldown plus hard-coded 1s, 4s, 0.5s, 2.5s, 400ms and 500ms values, a hidden Glory of the Dawn crit inferred by the cooldown model, and a bonus kick inferred from the Teachings buff. Forced time counts as ready. |
| monk-windwalker/ChiDetails/chi-wasted | covered | `primaryResourceCapFindings` | Ascension (cap 6) | chi gained into a full bar | Wasted per minute, dormant 0 / 1 / 2. Covered only if the app's primary resource for a Windwalker is chi; it picks whichever resource the player's casts log most, and that is not confirmed here. The tracker adds invisible gains (Obsidian Spiral, Zenith Stomp) from modelled rules. |
| monk-shared/TouchOfDeath/cast-efficiency | candidate | — | Fatal Touch (−90s) | Touch of Death not used | 85% of an execute-aware maximum: the whole-fight uses plus one per cooldown of time any target was under 15% health. Not tracked: the survey's shortest 92.7s against a 146.7s median over 26 casts, as it is gated by target health. The extra count sums over all targets and rounds up, so cleave overstates the maximum by up to one. Value: the player's own Touch of Death damage per skipped use, with the health windows from the log. Low. |
| monk-windwalker/statistics | no-damage | — | — | — | Display only: Combo Breaker procs gained vs expected, Rushing Wind Kick utilization, Fists of Fury tick donut, Glory of the Dawn crit rate, chi breakdown tab, and from the class layer Mystic Touch, Save Them All, Teachings of the Monastery average stacks, Jadefire Stomp resets, Celestial Conduit damage and healing totals. |

Not rules (models the rules above rest on): the chi and energy trackers
(Blackout Kick treated as one chi), the cooldown model that infers the
Rising Sun Kick reset, the Xuen's Battlegear pre-application and the hidden
Glory of the Dawn crit, the proc-window builder and its detail view, the
many normalizers and event links, the Celestial Conduit begin/end rebuild
and its event links, Heart of the Jade Serpent's recovery rate (+75% per
buff, the Unity Within version overriding the others), the Veteran's Eye
haste buff, the Cyclone's Drift haste multiplier, spell lists and the
cast-to-damage map (tables, not extracted). Jade Ignition is registered
but switched off, three files are not registered at all, and every
`suggestionThresholds` getter is dead.

## Candidates left

Ordered by expected value. All fail or pass in phase 3, and most will fail.

1. **Fists of Fury cadence** (efficiency, plus the cooldown-first priority
   rules and Rising Sun Kick): the only gap measured on a real pull, about
   2M for Blkphnx, but already attempted once by hand without being able to
   rebuild the ready times. Build only after the reductions can be fitted
   to the log, probably by extending `spentCooldownDrift` for a per-cast
   reduction. Top players are the premise check: if two or three of them
   also sit 3-4s above the rebuilt recharge, it is the model, not the
   player.
2. **Fists of Fury clips**: cheap to value from the player's own ticks;
   check how often top players clip with a priority spell ready.
3. **Zenith** (efficiency and unused granted Stomp casts): both case-study
   players used it; keep only if a log shows a lost charge.
4. **Heart of the Jade Serpent windows** and **Celestial Conduit
   channels**: log-visible mistakes, small value each.
5. **Combo Strikes breaks**: one cast's mastery share per break.
6. **Whirling Dragon Punch, Touch of Death** (untracked cooldowns): low,
   and they depend on another build for their interval.
7. **Strike of the Windlord, Slicing Winds, Chi Burst**: nothing to judge
   until a sample player takes them.
