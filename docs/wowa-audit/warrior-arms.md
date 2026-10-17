# WoWAnalyzer audit: Arms Warrior

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Warrior shared layer,
  then the spec), spot-checked at their source lines (3 of
  3 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares 12.1, but support level is "Foundation" (partial): the
  page itself says it has limited ability to parse logs and gives no
  accurate guidance. Last change 2026-08-29 (priority-list cleanup);
  the changelog is per spec, so every module below is "12.1, spec last
  touched 2026-08-29". **Almost nothing is graded.** The guide has four
  parts: a disclaimer, the shared downtime section, a cooldown graph with
  no grade, and the priority list's annotations. Every threshold getter in
  the spec's own modules (Mortal Strike usage, Overpower waste, Slam,
  Sweeping Strikes, Bladestorm, Demolish, dot uptime, dot refreshes, rage
  waste) has no consumer, so the casts they flag are timeline notes only.
  The thresholds are recorded below in case a guide section switches them
  on. The priority list is single-target by its own admission.
- **App:** `lib/damage/wow/specs/melee.ts` (`"Arms Warrior"`: Avatar
  window through `burstGcdFindings`, Rage at the cap through
  `primaryResourceCapFindings`, Avatar and Colossus Smash through
  `spentCooldownDrift`), `shared.ts`, `potion.ts`, generic checks. No
  tracked-cooldowns.ts entry for Arms (Avatar and Colossus Smash spread too
  far; the rest are not cast in the survey). No DoT check is wired for Arms.
  No case study against a WoWAnalyzer page: the header of melee.ts has none
  for Arms. The recharge rule was measured on three Arms Warriors
  (qpZx3mWaG7gcDdYB, NK1hBtW9rckdjq36; `shared.ts`).
- **Survey fact (spell-data.ts, 19 Arms players):** Demolish, Ravager and
  Champion's Spear are never cast by name; Cleave (555 casts) and Heroic
  Strike (655) are, and WoWAnalyzer's priority list does not check Cleave
  at all. The current build is not the one this spec's rules assume, so
  rows that need a talent the survey never shows would fire on nothing.
- **Phase 3:** not started.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Arms sets or adds.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| warrior-arms/AlwaysBeCasting/downtime-pct | superseded | `checkGcdGaps` | none | idle time | Graded good up to 15%, ok to 20%, fail above (core default 5 / 10 / 15). Whole-fight denominator, forced downtime not removed. |
| warrior-arms/Guide/cooldown-graph | no-damage | — | Avatar, Bladestorm, Colossus Smash, Ravager, Demolish (each needs its talent) | — | A bar per cooldown, red where a whole extra use would have fit. Not graded. Counts forced time as ready and misses reductions it doesn't model. The Avatar and Colossus Smash readings are covered by the cooldown rows below. |
| warrior-arms/Overpower/wasted-stack | candidate | — | none | Overpower cast at two stacks with Mortal Strike ready, outside execute | Wasted casts over all Overpower casts above 0 / 5 / 10%, no consumer. Needs Mortal Strike's ready time, which Battlelord resets (Not rules) hide, and an execute-range flag the app has no source for. Value would be the damage of the Mortal Strike pressed late. Low. |
| warrior-arms/Slam/slam-while-mortal-strike-ready | candidate | — | none | Slam cast while Mortal Strike was ready, outside execute | Bad over total Slam casts above 0 / 5 / 10%, no consumer. Same readiness and execute-range problems as the Overpower row. Value: Mortal Strike's damage per cast less Slam's, per occurrence. Slam is 370 casts in the survey, so there is data to value it. Cleave fights are not graded (a Slam may be right with Sweeping Strikes up). |
| warrior-arms/SweepingStrikes/not-during-colossus-smash | wrong | — | Sweeping Strikes, Colossus Smash | Sweeping Strikes within 1s after Colossus Smash | Bad over total above 0 / 20 / 50%, no consumer. The message says "during Colossus Smash" but the test sees only the first second; a cleave cooldown has nothing to do with burst alignment on one target. |
| warrior-arms/Bladestorm/aligned-with-colossus-smash-or-avatar | candidate | — | Bladestorm | Bladestorm cast with Colossus Smash or Avatar ready or within 5s | Bad over total above 0 / 10 / 30%. The cast annotation does show. A cooldown the player did not talent reads as ready, so it would flag every cast. Bladestorm's readiness shifts with Executioner (see Bladestorm efficiency). Value: the delayed partner cooldown, from `spentCooldownDrift`'s recharge model. Whether top players do it is not checked. |
| warrior-arms/Demolish/no-demolish-in-execute-without-colossus-smash | candidate | — | Demolish; Massacre moves execute to 35% | Demolish hit in execute range without Colossus Smash on the target | Count above 0 / 1. The execute flag is set once and never cleared in the source, so after one low-health hit every later Demolish counts. Demolish is never cast in the survey: it would fire on nothing now. Value: Demolish damage with vs without the buff. |
| warrior-arms/MortalStrike/usage-vs-possible | superseded | `checkGcdGaps` | none | fewer Mortal Strikes than the cooldown allows | Casts over the haste-scaled 6s maximum for the whole fight, below 90 / 80 / 70%. Forced time counts as ready and Battlelord resets are invisible. A missed Mortal Strike is an idle GCD (the gap check) or a lower filler in its place (the Slam row). Free Mortal Strikes from Bladestorm are relabelled and not counted; the app also excludes them from presses (`game.ts`). The 80% Mortal Strike and Overpower efficiency targets in Abilities (suggestion off) are the same thing. |
| warrior-arms/DeepWoundsUptime/uptime | candidate | — | none (mastery) | Deep Wounds off every enemy | Below 80 / 70 / 60% of the whole fight; the app's `dotUptimeFindings` could take it (it is in the survey's DoT list, 32.7 a minute). Applied by many abilities, so it is near full for anyone pressing buttons: expected variance is small. Low. |
| warrior-arms/RendUptime/uptime | candidate | `dotUptimeFindings` available, not wired | Rend | Rend off the target | Below 70 / 65 / 60%. The priority list explicitly excludes Rend, so uptime and rotation disagree. Rend is in the survey's DoT list (17.6 a minute) so players do take it. Premise check first: top players may drop it for cooldown windows. |
| warrior-arms/DeepWoundsRefreshes/early-refresh | wrong | — | none | Mortal Strike on a target already carrying Deep Wounds, in execute range | Efficiency below 90 / 80 / 60%. The Mortal Strike is cast for its own damage; the lost tail of a mastery DoT is negligible. The source also exempts most casts (non-execute, unseen enemies) and has dead exemption branches. |
| warrior-arms/RendRefreshes/early-refresh | candidate | — | Rend | Rend recast with time left | Efficiency below 90 / 80 / 70% of its 14s. The core pandemic candidate (core.md): value by the duration lost, not as a share of casts. Lowest value. |
| warrior-arms/RageDetails/rage-waste | covered | `primaryResourceCapFindings` | none | rage generated into a full bar | Wasted over wasted plus generated, below 75 / 70 / 65% efficiency; no consumer, a statistic only. A code comment says Arms cares about waste mainly in execute. WoWAnalyzer rebuilds swing rage by estimate; the app sees the cap only where the log reports it. Not measured on an Arms pull. |
| warrior-arms/AplCheck/priority-order | candidate | — | Slayer or Colossus list | a cast with a higher list rule available | One check for the list rules marked `superseded` below (Mortal Strike, Overpower, Heroic Strike, Execute and Slam ordering, with their stack conditions), not one per rule. Each cast is valued by that rule's spell's average damage per cast less the cast's own. The list picks Slayer with Slayer's Dominance, otherwise Colossus (Mountain Thane falls through to Colossus, inferred), and sets execute at 35% with Massacre, else 20%. Single-target by design: Cleave, Whirlwind, Sweeping Strikes, Thunder Clap and Ravager are never checked, so it misreads cleave. Build only if a page and a log disagree. |
| warrior-arms/AplCheck/slayer-hs-execute | superseded | priority-order (below) | Slayer; Master of Warfare | in execute with Master of Warfare up, Heroic Strike not first | Heroic Strike first in execute range while the buff is up. Master of Warfare is in the survey's buffs, and Heroic Strike is cast 655 times. Value: what the unused buff costs. A priority rule: see Candidates left. |
| warrior-arms/AplCheck/slayer-ms-execute-two-precision | superseded | priority-order (below) | Slayer; Executioner's Precision | in execute with two Precision stacks, Mortal Strike not cast | Mortal Strike at two stacks of the debuff on the target. Stack counts are in the log. |
| warrior-arms/AplCheck/slayer-op-execute-two-opportunist | superseded | priority-order (below) | Slayer; Opportunist | in execute with two Opportunist stacks, Overpower not cast | Overpower at two buff stacks. |
| warrior-arms/AplCheck/slayer-execute-sudden-death | covered | `checkProcs` (expiries) | Slayer; Sudden Death | Sudden Death left to expire | Execute with Sudden Death in execute range. Only the expiry of an unused proc is covered, and whether `checkProcs` registers Sudden Death as a consumable proc on an Arms pull is not measured; the ordering part is the candidate. |
| warrior-arms/AplCheck/slayer-execute-40-rage | superseded | `primaryResourceCapFindings` | Slayer | — | Execute at 40+ rage in execute range. The threshold keeps rage under the cap; the cap check counts the cap itself. |
| warrior-arms/AplCheck/slayer-op-execute | superseded | priority-order (below) | Slayer | in execute, Overpower not cast when listed | Overpower in execute range after the stack-conditioned rules. Filler order. |
| warrior-arms/AplCheck/slayer-hs | superseded | priority-order (below) | Slayer; Master of Warfare | Master of Warfare up, Heroic Strike not cast | Same rule outside execute. |
| warrior-arms/AplCheck/slayer-op-two-opportunist | superseded | priority-order (below) | Slayer; Opportunist | two Opportunist stacks, Overpower not cast | Same rule outside execute. |
| warrior-arms/AplCheck/slayer-ms-outside-execute | superseded | priority-order (below) | Slayer | not in execute, Mortal Strike not cast | Mortal Strike outside execute. Overlaps the Slam row. |
| warrior-arms/AplCheck/slayer-execute | covered | `checkProcs` (expiries) | Slayer; Sudden Death | Sudden Death left to expire | Execute whenever usable (Sudden Death, or 20 rage in execute). Sudden Death part covered as above; the rage part is the rage-cap check's. |
| warrior-arms/AplCheck/slayer-op-outside-execute | superseded | priority-order (below) | Slayer | not in execute, Overpower not cast | Filler order. |
| warrior-arms/AplCheck/slayer-slam | superseded | priority-order (below) | Slayer | not in execute, Slam not the filler | Slam as the last filler. Filler-over-filler, small per cast. |
| warrior-arms/AplCheck/colossus-hs-execute | superseded | priority-order (below) | Colossus; Master of Warfare | as the Slayer rule | In execute with the buff up, Heroic Strike. |
| warrior-arms/AplCheck/colossus-ms-execute | superseded | priority-order (below) | Colossus; Colossal Might, Executioner's Precision | in execute, Mortal Strike not cast with two debuff stacks or under 10 Colossal Might stacks | Both stack counts are in the log. |
| warrior-arms/AplCheck/colossus-execute-sudden-death | covered | `checkProcs` (expiries) | Colossus; Sudden Death | Sudden Death left to expire | Execute with Sudden Death in execute range. Expiry only, as above. |
| warrior-arms/AplCheck/colossus-execute-deep-wounds-75-rage | superseded | `primaryResourceCapFindings` | Colossus; Deep Wounds | — | Execute above 75 rage. A rage threshold in front of the cap. |
| warrior-arms/AplCheck/colossus-op-execute | superseded | priority-order (below) | Colossus | in execute, Overpower not cast | Filler order. |
| warrior-arms/AplCheck/colossus-execute-75-rage | superseded | `primaryResourceCapFindings` | Colossus | — | Execute above 75 rage, the same threshold without the Deep Wounds condition. |
| warrior-arms/AplCheck/colossus-ms-below-10-colossal-might | superseded | priority-order (below) | Colossus; Colossal Might | under 10 stacks, outside execute, Mortal Strike not cast | Keeps the stack count building. |
| warrior-arms/AplCheck/colossus-hs | superseded | priority-order (below) | Colossus; Master of Warfare | buff up, Heroic Strike not cast | Same rule without the execute condition. |
| warrior-arms/AplCheck/colossus-execute-two-sudden-death | superseded | priority-order (below) | Colossus; Sudden Death | two Sudden Death stacks, Execute not cast outside execute | The stack count is in the log. Expiry is `checkProcs`'. |
| warrior-arms/AplCheck/colossus-ms | superseded | priority-order (below) | Colossus | not in execute, Mortal Strike not cast | Overlaps the Slam row. |
| warrior-arms/AplCheck/colossus-execute | covered | `checkProcs` (expiries) | Colossus; Sudden Death | Sudden Death left to expire | Execute whenever usable; expiry only, rage part is the cap check's. |
| warrior-arms/AplCheck/colossus-op | superseded | priority-order (below) | Colossus | not in execute, Overpower not cast | Filler order. |
| warrior-arms/AplCheck/colossus-slam | superseded | priority-order (below) | Colossus | not in execute, Slam not the filler | Last filler. |
| warrior-arms/Abilities/colossus-smash-efficiency | covered | `spentCooldownDrift` (Colossus Smash, 45s) | Colossus Smash; Anger Management | Colossus Smash held | 90% target. Not tracked by `checkCooldownDrift`: the shortest and median intervals measured 24.5 / 32.2s, so the app models the recharge from rage spent. WoWAnalyzer counts forced time as ready; the app takes it out. |
| warrior-arms/Abilities/avatar-efficiency | covered | `spentCooldownDrift` (Avatar, 90s) + `burstGcdFindings` (Avatar window) | Avatar; Anger Management | Avatar held, idle inside the window | 90% target. Measured intervals 51.2 / 64.1s, so untracked. The window check is the app's own; WoWAnalyzer has no Avatar window grade. |
| warrior-arms/AngerManagement/cooldown-reduction | verified | `spentCooldownDrift` | Anger Management | — | Every 20 rage spent takes one second off the remaining Colossus Smash and Avatar cooldowns; reduction while ready is counted as wasted. The app measured the same rule on three Arms Warriors (an Avatar after 650 rage predicted 57.5s, observed 57.5s). Matched; WoWAnalyzer's wasted-reduction count is display only. |
| warrior-arms/Abilities/bladestorm-efficiency | candidate | — | Bladestorm; Executioner | Bladestorm held | 70% target, suggestion off; the app's melee.ts says it resets (15-20s comebacks) and leaves it unjudged, and the survey shows intervals of 15.2s minimum and 34.3s median. The reduction rule (class layer): five seconds off per Executioner stack on an Execute made with Sudden Death up. `spentCooldownDrift`'s `reduceOn` takes a fixed amount per buff event, so it fits if Executioner stacks log as buff events; whether they do on the player is the measurement. Value: a Bladestorm channel including its free Mortal Strikes. Best of the candidates. |
| warrior-arms/Abilities/demolish-efficiency | candidate | — | Demolish; Colossal Might | Demolish held | 90% target, 45s. Reduction: refreshing Colossal Might at 10 stacks takes five seconds off (a code comment says two; the constant says five; unresolved). Fits `reduceOn` with `prePullFromBuff` unneeded. Never cast in the survey, so fires on nothing now. |
| warrior-arms/Abilities/ravager-and-spear-efficiency | candidate | — | Ravager; Champion's Spear | either held | 90% and 70% targets, 90s each. Neither is cast in the survey: add to tracked-cooldowns.ts only when a log shows them, measuring the shortest and median intervals first (the survey rule). Low. |
| warrior-arms/Abilities/cleave-efficiency | wrong | — | Cleave | — | 60% target, 4.5s haste-scaled, with a code comment that the author is unsure when it is worth it. Whether a cleave press is right depends on the target count; a whole-fight share is fight-blind. Cleave is cast often (555 times in the survey) and the priority list never checks it. |
| warrior-arms/Abilities/overpower-and-mortal-strike-efficiency | superseded | `checkGcdGaps` | none | — | The 80% targets (suggestion off); same as the Mortal Strike usage row. |
| warrior-shared/Executioner/bladestorm-while-not-enraged | no-damage | — | Bladestorm | — | Fury only (the handler compares the spec); an Arms equivalent was considered and not written. |
| warrior-arms/utility | no-damage | — | Die by the Sword, Spell Reflection, Rallying Cry, Charge, Heroic Leap, Storm Bolt, Impending Victory, Defensive Stance | — | Defensives, movement, healing and utility; efficiency targets are low or 1%. (Die by the Sword is declared with a one-second cooldown, a unit mistake.) Not judged. |
| warrior-arms/statistics | no-damage | — | various | — | Display only: Deep Wounds and Rend bars, Tactician procs, Overpower buffs wasted, rage wasted %, cooldown throughput (damage in Sweeping Strikes, Avatar and a ten-second Colossus Smash window), Defensive Stance damage, Fatal Mark, Champion's Spear damage, Spell Reflection mitigation (tooltip says 20%, computed 25%), Impending Victory healing, and the talent sub-statistics (they render only inside a container that is commented out, so probably never show). |

## Not rules

Hand-maintained models the rules above rest on: the priority-list branch
choice (Slayer or Colossus list by talent), the execute-range tracker
(per-enemy flag from health on the player's own damage events, ending two
seconds after the last in-range hit; the upper-bound test can never be true),
the Tactician (Overpower reset) and Battlelord (Mortal Strike reset) cooldown
models, Executioner's Bladestorm reduction, the Unhinged relabelling of free
Mortal Strikes, the Improved Execute rage refund, Overpower and Battlelord
event reordering, the Demolish cast link, the Sudden Death stack-refresh
filter, the class rage model (tracker, swing rage generation, attribution,
rage scaling), the Cooldown throughput configuration and the Abilities
spellbook. Table values: not extracted. Dead code: the commented-out talents
container.

## Candidates left

All unmeasured; most will fail phase 3 (the top players do the same).

1. **Bladestorm efficiency with the Executioner reduction**: the one large
   gap in the app's Arms coverage. First measure whether Executioner stacks
   appear as player buff events and whether the survey's 15.2s minimum
   interval is explained by them. Value from the cast, the channel's damage
   including its free Mortal Strikes. Separating a mistake from a top-player
   habit: holding it for a Colossus Smash or Avatar window is deliberate.
2. **priority-order**: one check for the list rules (Mortal Strike /
   Overpower / Slam / Execute rows): each cast with a higher rule available,
   valued by that spell's average damage per cast less the cast's own.
   Single-target caveat: Cleave and Sweeping Strikes are not in the list.
   Build only if a page and a log disagree.
3. **Rend and Deep Wounds uptime** through `dotUptimeFindings` (the ids are
   in the survey's DoT list). Cheap to build; Deep Wounds will rarely fire.
4. **Demolish, Ravager and Champion's Spear** (`reduceOn`, tracked cooldowns,
   Demolish in execute): worth nothing until a log casts them.
5. **Overpower wasted stack, Slam with Mortal Strike ready**: need Mortal
   Strike readiness, which Battlelord resets hide. Low.
6. **Rend early refresh**: lowest.

The Sweeping Strikes, Deep Wounds refresh and Cleave rows are `wrong`
without measurement; their premises are visible in the source alone.
