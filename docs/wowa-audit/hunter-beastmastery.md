# WoWAnalyzer audit: Beast Mastery Hunter

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Hunter shared layer,
  then the spec), spot-checked at their source lines (6 of
  6 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** lagging. It declares patch 12.0.7 against a clone at 12.1.0,
  flagged partially maintained; last change 2026-10-13 (Trigger Finger
  haste). The big talent and cooldown fixes were 2026-07-09, so every
  talent rule below is unverified on 12.1.0. The guide has one graded
  element, Focus at the cap, plus the shared preparation section. There is
  no cooldown section, priority list or checklist. Most other rules are
  threshold getters nothing in the guide reads, per-cast annotations, or
  statistics; each row says which. The hunter modules Stampede, Howl of
  the Pack Leader's boar, Sentinel's Mark, Moonlight Chakram, Survival of
  the Fittest and Exhilaration are not wired for this spec, so those
  shared records do not apply.
- **App:** `lib/damage/wow/specs/ranged.ts` (`"Beast Mastery Hunter"`:
  Bestial Wrath window, Focus at the cap with Barbed Shot excluded),
  `tracked-cooldowns.ts` (Bestial Wrath, 30s), `potion.ts`, generic
  checks. Case study: qpZx3mWaG7gcDdYB pull 3 (Deathstriker) against
  jmprxRc62fHCZy7g fight 25 (Matcheh, 99th); the header of ranged.ts
  records what matched. Cast rates matched (Kill Command 17.0 vs 15.8 a
  minute, Barbed Shot 9.2 vs 9.9, Cobra Shot 13.7 vs 15.4, Bestial Wrath
  1.9 vs 2.0). WoWAnalyzer's page showed only Focus waste (19.2% vs 17.9%,
  both "bad") and potions (2 of 2 both).
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Beast Mastery
  sets or adds.
- **Phase 3:** not started.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| hunter-beastmastery/ResourceUseSection/focus-at-cap | verified | `primaryResourceCapFindings` (Barbed Shot excluded) | none | standing at the Focus cap | The only graded guide element: share of the fight at the cap, perfect at 5% or under, good 10%, ok 15%, fail above. Case study 19.2% vs 17.9% on the page; the app measures lost generation instead and does not count Barbed Shot pressed at full Focus (its Focus arrives over time and it runs on charges: Matcheh did it 38 times, Deathstriker 28). WoWAnalyzer counts forced downtime as time at the cap, the app does not. The same rule is shared with the hunter generator-waste rule. |
| hunter-beastmastery/AlwaysBeCasting/active-time | superseded | `checkGcdGaps` | none | idle time | Own minor / average / major tiers below 90 / 85 / 80% of the whole fight; no guide section reads it. Forced time counts as inactive. Case study: 39.9 vs 43.2 GCDs a minute, pace 1.22s vs 1.11s, which the app shows as gaps and delays. |
| hunter-beastmastery/Abilities/kill-command-efficiency | candidate | none (Kill Command is not in tracked-cooldowns.ts) | Alpha Predator (second charge); Cobra Shot, War Orders, Killer Cobra (reductions) | Kill Command held | 85% target, whole fight, forced time counted as ready; base recharge 7.5s, haste-scaled. Left out of the tracked list because it runs on charges and reductions, a skipped cast is never a whole lost use. Build with `spentCooldownDrift`: it takes a fixed reduction per buff event, so Cobra Shot's one second per cast and War Orders' three per Barbed Shot would need a cast-based reduction source (unconfirmed it can), and Killer Cobra's full reset inside Bestial Wrath would not fit it at all. Value: a missed cast times the player's own Kill Command average. Expected value low: cast rates already matched the reference in the case study, and every reduction source is a model that skews the number if missed. Doubtful on 12.1.0. |
| hunter-beastmastery/Abilities/bestial-wrath-efficiency | covered | `checkCooldownDrift` (Bestial Wrath, 30s) + `burstGcdFindings` window | The Beast Within (90 → 30s) | Bestial Wrath held | 90% target, whole fight. The app tracks it at the measured 30s and judges the window from the hits. **Overstates:** forced time counts as ready, and with a 30s recharge a one-minute Stasis reads as two missed casts. |
| hunter-beastmastery/CobraShot/kc-cdr-efficiency | no-damage | — | Cobra Shot | — | Share of each Cobra Shot's one-second Kill Command reduction that landed on a running cooldown; tiers 85 / 80 / 75% but no consumer in the guide. Needs the modelled cooldown, so not log-visible. Display only. |
| hunter-beastmastery/CobraShot/wasted-casts | unverifiable | — | Cobra Shot | Cobra Shot with Kill Command ready | Counts shots made while Kill Command was fully available (0 / 1 / 2+ tiers); no consumer. The cooldown state is a model, and the shot is the filler that fits there anyway. |
| hunter-beastmastery/CobraShot/cast-over-barbed-shot | candidate | — | Barbed Shot, Cobra Shot | Cobra Shot while a Barbed Shot charge was available | Marks a Cobra Shot cast when a charge existed, an absolute "Barbed Shot first". Barbed Shot's cooldown (18s, two charges, with reductions from Barbed Scales, Pack Mentality and Scent of Blood) is modelled in their code. Value: the Barbed Shot damage plus its Focus and haste buff, less a Cobra Shot, per case; Barbed Shot at full Focus is already known not to be waste. Separating a mistake from top play: holding a charge to avoid capping Focus is allowed, so the test is how often Matcheh-level players cast Cobra Shot with a charge up. Expected value low to middling: the case-study cast rates matched, but a charge sitting idle at the cap is a real, loggable loss. Build only after a recharge fit from the log (charge cast times) reproduces WoWAnalyzer's availability. |
| hunter-beastmastery/CobraShot/low-focus-early-cast | wrong | — | Cobra Shot | Cobra Shot under 50 Focus with under a second of reduction gained | A per-cast annotation, no grade. It rests on the modelled Kill Command state, and a Cobra Shot is the filler when Focus is low anyway. |
| hunter-beastmastery/NaturesAlly/kill-command-without-buff | candidate | — | Nature's Ally | Kill Command cast before Cobra Shot, Barbed Shot or Black Arrow gave the buff | Annotates each Kill Command made without the buff as missing 30% extra damage (the note itself says it is fine on cleave and the code cannot tell, so it applies on every fight). Buff and casts are both in the log. Value: the buffed vs unbuffed Kill Command average from the player's own hits, times the unbuffed casts. Separate a mistake from play: Kill Command is on a recharge, so a cast made as it came off cooldown with the buff down is right; compare unbuffed counts on top parses, the same way the Elemental Master of the Elements row failed. Expected value low: the buff is cheap to keep up and probably is. The 30% is not checked on 12.1.0. |
| hunter-beastmastery/BeastCleave/hit-less-windows | wrong | — | Beast Cleave | Beast Cleave refreshed on a single target | Counts pet buff windows in which the cleave hit nothing as wasted. On a single target every window is "no hits" by design, the inverse of what cleave scoring wants. Which spell grants it in 12.x is also unconfirmed. Uptime shown divides by the whole fight. No consumer for the thresholds. |
| hunter-beastmastery/KillerCobra/wasted-resets | unverifiable | — | Killer Cobra | Cobra Shot in Bestial Wrath with Kill Command off cooldown | Counts Cobra Shots inside the window whose reset found Kill Command already ready (0 / 1 / 3+); no consumer. Needs the cooldown state; a Cobra Shot is the right filler with the reset available. |
| hunter-beastmastery/BasicAttacks/macro-delay | candidate | — | none | the pet's basic attacks firing late | Pet Bite, Claw or Smack events closer than 3.4s count as chained, and the delay beyond a 3.15s macro cadence is turned into potential extra casts and damage. Pet damage events are in the log, so it is visible. Value: the extra casts times the average basic attack hit. Separate a mistake from play: does the top player actually keep the chain, and do the player's pet's basic attacks exist in the log at all (the pet is often missed)? Doubtful on 12.1.0: the module has no changelog entry and the pet cooldown may have changed. Expected value low; fails if the top players run the same delay. |
| hunter-beastmastery/BeastMasteryFocusCapTracker/regen-config | unverifiable | — | Pack Tactics | Focus at the cap with regen running | Configures the shared natural-regen-waste rule for this spec (5 Focus per second base, +75% with Pack Tactics, max fixed at 100). Passive regen lost at the cap is not in the log (dps-analysis.md); the app measures lost generation from casts made at the cap. The values are not checked on 12.1.0. |
| hunter-beastmastery/FocusDetails/generator-waste | covered | `primaryResourceCapFindings` | none | generators cast into a full bar | The shared rule: Focus wasted over Focus generated, at 5 / 10 / 15% wasted. It is the cap rule seen through the generators; the app counts it once. |
| hunter-beastmastery/CancelledCasts/cancelled-pct | covered | `checkInterrupts` | Black Arrow (the module is switched off for the spec without it) | a cast cut by movement | Completed share under 97.5 / 95 / 90%. Counts casts cut by forced phases against the player. Not graded in the guide. |
| hunter-beastmastery/statistics | no-damage | — | — | — | Display only: Cobra Shot, War Orders, Barbed Scales and Pack Mentality cooldown reduction totals, Scent of Blood charges, Killer Cobra resets, Bestial Wrath buff uptime, Bloodshed, Beast Cleave damage, Dire Beast and Dire Command damage with a proc-likelihood chart, Dark Hound, Animal Companion, Aspect of the Beast, Stomp, Deathblow, Binding Shot, Tranquilizing Shot, Master Marksman, Focus graphs. |
| hunter-shared/utility | no-damage | — | — | — | Aspect of the Turtle, Exhilaration, Survival of the Fittest, Camouflage, Misdirection, Feign Death and its death filter, Disengage, Cheetah, Concussive Shot, Counter Shot, traps, Flare, Hunter's Mark, pet abilities. Utility and defensives aren't judged. The case study's 3.9s gap in Aspect of the Turtle at 5:02 was a survival call and is counted as idle. |

Not rules (models the rules above rest on): the cooldown model for Kill
Command and Barbed Shot (Cobra Shot, War Orders, Killer Cobra, Barbed
Scales, Pack Mentality, Scent of Blood, Alpha Predator charges, Trigger
Finger in the shared haste model), the Dire Beast normalizers that tell
a Dire Command proc or a Bestial Wrath set bonus apart from a normal
summon, the Barbed Shot Focus regen accounting that back-computes waste
the log doesn't report, event links, timeline highlights, and the spender
list for the resource display. Several constants (Killer Instinct, Thrill
of the Hunt, Stampede hits) are unused; their values are not extracted.

## Candidates left

In order of expected value:

1. **cast-over-barbed-shot**: the only candidate with a direct log trace
   (a charge sitting at the cap while Cobra Shot is pressed). Fit the
   charges from cast times first. Hold-for-Focus is allowed, so compare
   against the 99th-percentile count before building.
2. **kill-command-efficiency**: the `spentCooldownDrift` route, if a
   cast-based reduction can be expressed there. Low: the case-study rates
   already match.
3. **kill-command-without-buff**: measure the unbuffed share on top parses
   first; probably equal.
4. **macro-delay**: only if the pet's attacks are in the log; probably
   fails against the top players.

Nothing here has been measured on a log. The case study matched cast
rates, so the app already covers the visible play; every remaining
candidate rests on a modelled cooldown or a talent unchecked on 12.1.0.
