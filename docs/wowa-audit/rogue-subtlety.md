# WoWAnalyzer audit: Subtlety Rogue

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Rogue shared layer,
  then the spec), spot-checked at their source lines (3 of
  3 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares 12.1.0, fully maintained; last change 2026-08-23
  (Shadow Dance analysis for the Deathstalker and Trickster hero trees).
  No priority list (the helper file for one is never imported) and no
  checklist: every grade is a guide section or a cast-efficiency target.
  The author says the analysis covers the single-target rotation and
  major mistakes only. Many `*Thresholds` getters on the spec's classes
  are defined but nothing reads them; those are rows below marked as
  never graded. Shadow Dance is the centre of the guide: each window gets
  the worst of its sub-grades, and the sub-grades depend on the hero
  tree (three checks for Deathstalker, four for everyone else).
- **App:** `lib/damage/wow/specs/melee.ts` (`"Subtlety Rogue"`: the
  Shadow Blades window through `burstGcdFindings`, and the energy cap
  through `primaryResourceCapFindings`), `tracked-cooldowns.ts` (Shadow
  Blades 90s, Goremaw's Bite 45s), `potion.ts`, generic checks. Nothing
  else is Subtlety-specific: no Shadow Dance window, Secret Technique,
  Vanish or combo point check. No case study: only 4 Subtlety players
  are in the survey, and the melee.ts header records case studies for
  other specs, so no row below is `verified`. The shared.ts header notes
  that the Energy cap estimate runs high for Subtlety.
- **Core rules** (active time, cast efficiency, potions) are in
  [core.md](core.md); the Rogue shared layer (combo point and energy
  waste, finisher tracker, instant poison) is judged in the rows below.
  Rows cover only what Subtlety sets or adds.
- **Phase 3:** not started.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| rogue-subtlety/ABC/downtime-pct-override | superseded | `checkGcdGaps` | none | idle time | Meant to loosen the downtime thresholds to 25 / 30 / 35%, but the getter is named differently from the one the core reads, so the core 5 / 10 / 15% applies and the override is dead. Whole fight, Stasis included. The guide doesn't show it either way. |
| rogue-subtlety/ShadowDanceGuide/window-grade | superseded | — | hero tree (Deathstalker or Trickster); Deeper Stratagem | any window with a failing sub-check | The worst of the sub-grades below, per Shadow Dance window; a player in neither tree is judged with the Trickster checks. Each sub-check is judged on its own row. |
| rogue-subtlety/ShadowDanceGuide/gcds-filled | superseded | the active-time row below | Deepening Shadows | a window with idle GCDs | Expects one counted cast per second of window, rounded up (all = perfect, one short = good, two short = fail). The window premium is the active-time candidate below; this version's counting is broken: it counts only six finishers and shuriken casts, so Backstab, Gloomblade and Shuriken Toss in a window read as missing, and a 7.1s window demands 8. |
| rogue-subtlety/ShadowDance/active-time-in-window | candidate | `checkGcdGaps` (the normal GCD only) | none | idle GCDs in a Shadow Dance | Meant to grade average active time inside dance windows (below 95 / 90 / 80%), but the getter is never read and the guide shows the average in a fixed good colour. Not a double count: idle inside the dance costs more than a normal GCD, and the app keys only Shadow Blades as a window. Build as `burstGcdFindings` on the Shadow Dance buff, valued at the dance's measured bonus, less forced time. |
| rogue-subtlety/CastsInStealth/casts-per-window | superseded | the active-time row above | Subterfuge | stealth or dance windows with fewer casts than a fixed maximum | Intended 1 builder per stealth window and 8 per dance (3 and 9 with Subterfuge), with Shadowstrike used instead of Backstab. The getters are never read, so it grades nothing. As written it is the fill-the-window idle again, and the "wrong builder" half tests something the game decides (Shadowstrike replaces Backstab in stealth). |
| rogue-subtlety/ShadowDanceGuide/secret-technique-timing | candidate | — | Deathstalker hero tree; Shadow Blades | Secret Technique cast late in a dance, skipped, or a dance entered without it | Deathstalker only. Secret Technique should be among the first two finishers; usable but not cast is a fail, and so is entering a dance without it (except the second dance of a Shadow Blades window). "Usable" is a modelled cooldown, because resets aren't logged, with 2s of grace. Value the Secret Technique cast lost or delayed, from the player's own damage per cast. The order alone is probably small; the skipped cast is the real loss. |
| rogue-subtlety/ShadowDanceGuide/ancient-arts-pairing | candidate | — | Deathstalker (Darkest Night); Ancient Arts rank 3 | an Eviscerate under Darkest Night without the Ancient Arts buff | Counts casts outside the last second of the window; none = perfect, one = ok, two or more = fail. Needs both buffs in our buff stream. Value each miss as the player's average Eviscerate with the buff less without it, from their own hits. Without rank 3 the buff never appears and every cast would fail, so gate on the talent. The cleanest of the Shadow Dance candidates because it is a proc-lost shape. |
| rogue-subtlety/ShadowDanceGuide/cooldown-alignment | wrong | — | Shadow Blades; non-Deathstalker hero tree | a Trickster dance with Secret Technique down and Shadow Blades down | Strict either/or: a dance cast to avoid capping its charges (Double Dance) grades as a fail. The spec's own cast-efficiency text tells the player to dance before the charges cap, so the two contradict. Premise read from the code and its own text, not measured. |
| rogue-subtlety/ShadowDanceGuide/entry-energy | candidate | — | Shadow Focus | a dance entered below 30 or 35 energy | Only graded when Secret Technique is usable or Shadow Blades is up. Costs are hard-coded base costs, so a Shadow Focus player is held to the full cost. Energy is in the log on casts (the shared.ts note says its estimate runs high). Low value: an energy-short dance mostly shows up as an idle GCD. |
| rogue-subtlety/ShadowDanceGuide/entry-combo-points | candidate | — | Deeper Stratagem | a dance entered below the combo point cap | Strict: 4 of 5 fails. Also applies to a player in no recognised tree. Merge with the combo point row below. |
| rogue-subtlety/ShadowBlades/dance-alignment | candidate | — | Shadow Blades; Double Dance | Shadow Blades cast with Shadow Dance down and unavailable | The cast must come while a dance is up or has a charge; no grace. Availability is a modelled cooldown. The app judges the Shadow Blades window's GCDs, not what the player lined up inside it. Merge with the next two rows as one "Shadow Blades setup" check. |
| rogue-subtlety/ShadowBlades/secret-technique-available | candidate | — | Shadow Blades | Shadow Blades cast with Secret Technique on cooldown | No grace: one second from ready fails. Pre-pull casts aren't handled. Merge with the row above. |
| rogue-subtlety/ShadowBlades/two-dances | candidate | `burstGcdFindings` (Shadow Blades) | Shadow Blades; Double Dance | a Shadow Blades window with one or three dances | Wants exactly two dances in each window. The links look forward only, so the standard opener (a dance cast just before Shadow Blades) is probably read as one dance and fails; the file's own dance module back-credits it, so the two disagree. Not checked against a log. No exemption for the last window or Stasis. Worth building only after that is settled. |
| rogue-subtlety/Shadowstrike/stealth-only | wrong | — | Subterfuge | Shadowstrike without a stealth-type buff | Checks the cast against four buffs. As far as the game goes, Shadowstrike can only be cast under stealth, so the check can only fire on a gap in its own buff list (the dance entry may use the spell rather than the buff, and a buff consumed by the cast itself isn't tolerated). |
| rogue-subtlety/guide/EnergyCapWaste/time-at-cap | covered | `primaryResourceCapFindings` | Vigor | Energy generated into a full bar | Perfect to 5%, good to 10%, ok to 15%, fail above, over the whole fight with Stasis counted as capped. The app sees only non-spending casts made at the cap. Pooling energy for Shadow Dance on purpose is penalised here. |
| rogue-shared/EnergyDetails/wasted-generator-energy | covered | `primaryResourceCapFindings` | none | energy gains at a full bar | Event-based gains only. The app's cap check sees the same casts. |
| rogue-shared/EnergyCapTracker/regen-lost-at-cap | unverifiable | — | Vigor | passive regen lost at the cap | Predicted, not logged (core.md). The part the log shows is the row above. |
| rogue-subtlety/Energy/wasted-ratio | superseded | `primaryResourceCapFindings` | Vigor | — | Meant to grade energy waste over generated at 3.3 / 6.6 / 10%, but the getter is never read. The same waste as the two rows above. |
| rogue-subtlety/guide/CooldownGraph/shadow-blades | covered | `checkCooldownDrift` (Shadow Blades, 90s) | Shadow Blades | Shadow Blades held | Default 80% target on the cooldown bar; the text says use it on cooldown in most cases. WoWAnalyzer counts forced time as ready and expects a last use even when the fight ends first; the app counts whole lost uses less forced time. Holding it to line up the dances is penalised here and rewarded by the setup rows above. |
| rogue-subtlety/guide/CooldownGraph/goremaws-bite | covered | `checkCooldownDrift` (Goremaw's Bite, 45s) | Goremaw's Bite | Goremaw's Bite held | 90% target, only when talented. Same overstatement as above. |
| rogue-subtlety/guide/CooldownGraph/secret-technique | candidate | — | Secret Technique (haste-scaled 25s base) | Secret Technique held | 80% target on the bar. Not tracked in the app and the tracked-cooldowns.ts comments hold no measurement for it, so its real spread is unknown. Its own text says to hold it for Shadow Blades, which fights the efficiency bar. Measure the interval spread first; if it is tight after haste, track it. |
| rogue-subtlety/guide/CooldownGraph/vanish | candidate | — | none | Vanish held | 80% target on the bar, 120s. Not tracked for Subtlety. Unlike Assassination (where a Vanish is valued as the Garrote it empowers) no per-use value is known here, and the Find Weakness row below is the only damage reason the spec gives. Low value. |
| rogue-subtlety/Abilities/shadow-dance-efficiency | candidate | — | Double Dance (2 charges); Deepening Shadows | Shadow Dance charges held or capped | 95% target, whole fight, with a note to dance before the charges cap. Left out of tracked-cooldowns.ts because its charges spread it. The spec models a reduction: every combo point spent by a finisher takes one second off the remaining cooldown while it is down (the code comment says 1.5s and declares a 0.5s Enveloping Shadows extra that is never applied). That fits `spentCooldownDrift` (a per-unit reduction, as Arms uses for Rage), with two charges; unverified whether combo points spent can be read from our casts. Value a lost dance as the Shadow Dance window's damage above ordinary play. The dance and Secret Technique alignment rows above fight this one. |
| rogue-subtlety/Abilities/shuriken-tornado-efficiency | candidate | — | Shuriken Tornado | Shuriken Tornado held | Default 80% target, 60s, only when talented, no bar drawn. Not tracked; no measurement of its interval. Low value, merge with the Secret Technique and Vanish rows if built. |
| rogue-subtlety/FinisherUse/low-cp-finishers | candidate | — | Deeper Stratagem | an Eviscerate cast below 4 combo points | Chart only. The first 30 seconds of the fight are excused, measured from fight start, and only Eviscerate counts (not Coup de Grace or Black Powder). The target of 4 clashes with its own "5+" text. Merge with the combo point rows. |
| rogue-shared/FinisherTracker/inefficient-finishers | superseded | — | stratagem talents | finishers under the recommended points | The shared version of the row above. Subtlety replaces it with its own, and the shared getter isn't graded here. |
| rogue-shared/ComboPointDetails/wasted-cp | candidate | — | stratagem talents | generators landing at max combo points | See "Candidates left". Value each wasted point as a share of a finisher's damage. Some bonus-point waste is unavoidable (the tooltip says so). |
| rogue-subtlety/ComboPoints/wasted-ratio | superseded | — | stratagem talents | — | Meant to grade combo point waste over generated at 5 / 10 / 15%; the getter is never read and it overlaps the shared rule. |
| rogue-subtlety/BuilderUse/wasted-builders | candidate | — | none | a builder that gained no points at max | Chart only. Merge with the combo point rows. Its Shuriken Storm waste is rewritten by a normalizer, so it rarely counts. |
| rogue-subtlety/GeneratorFollowingVanish/non-generator-after-vanish | wrong | — | none | the first cast after Vanish isn't a generator | A statistic table only (the getter is never read). Gloomblade is missing from the generator list, so a Gloomblade player is flagged for a correct cast, and an off-GCD cast in between (trinket, potion) counts as a miss. |
| rogue-subtlety/VanishFindWeakness/early-vanish | candidate | — | Find Weakness | Vanish used to reapply Find Weakness with over 1s left | Shadowstrike or Cheap Shot after Vanish onto a target that still carries the player's Find Weakness (18s). Needs the enemy debuff in our stream. Hard-coded 1s and 18s; it blames the last Vanish for a later normal Shadowstrike. One enemy only. Value the Vanish use wasted (and so the cooldown spent) if built; low. |
| rogue-shared/InstantPoison/proc-rate | no-damage | — | none | — | Poison hits over melee hits. A luck measure. |
| rogue-subtlety/statistics | no-damage | — | — | — | Display only: Shadow Dance and Shadow Blades uptime, Black Powder damage, the Dark Shadow contribution estimate, per-window dance damage, duration and cast strips, total dance damage and share, Shadow Blades per-use list, the (always good) Backstab and Eviscerate cast lists, builder and spender donuts, combo point and energy graphs, Deeper Daggers uptime, Echoing Reprimand gains, the Arcane Torrent helper. |
| rogue-shared/utility | no-damage | — | — | — | Crimson Vial, Evasion, Feint, Cloak of Shadows, Shroud of Concealment, Blind, Kidney Shot, Sprint, Shadow Step, Kick, Tricks of the Trade, Distract, Thistle Tea. Cooldowns declared for tracking only. Utility and defensives aren't judged. |

Not rules (models the rules above rest on): the combo point and energy
trackers (cap 5 plus the stratagem ranks, energy cap and regen scaled by
Vigor, Shadow Focus cost reduction), the Shuriken Storm waste normalizer,
the event links (each Shadow Dance to its removal and the damage inside
it; each Shadow Blades to its removal and the dances in it, 21s search),
the dance damage tracker, the stealth helpers and stealth damage tracker,
the per-window dance data model (energy and combo points at entry, Secret
Technique cooldown remaining, dance index within Shadow Blades), the
Deepening Shadows cooldown reduction, Rupture and pandemic helpers that
no module calls, and hero tree detection. Dead code: a misspelled
duplicate of the Eviscerate module, an unused Dark Shadow base class, and
the unimported priority-list helpers.

## Candidates left

Ordered by expected value. None has been measured, and most candidates
fail phase 3. The app already covers the one whole-fight number the spec
grades well (energy cap) and the Shadow Blades cooldown and window.

1. **Ancient Arts pairing (Deathstalker)**: value each Eviscerate cast
   under Darkest Night without Ancient Arts, from the player's own
   Eviscerate hits with and without the buff. Separating a mistake from
   what top players do: count the misses per window for the top parses;
   the buff may be gated by something outside the player's control, which
   would make it a floor, not a mistake. Cheap, and the likeliest to
   survive.
2. **Shadow Dance cooldown drift**: track the dance through
   `spentCooldownDrift` if the combo points spent can be read from casts,
   with two charges and the one-second-per-point reduction; value a lost
   dance as the window's damage above ordinary play. The risk is the
   alignment with Secret Technique and Shadow Blades that top players
   choose by holding it, and a charge cap that only shows on a fast
   fight.
3. **Combo point waste and low-point finishers** (merging the waste,
   builder, finisher and dance-entry rows): value each wasted point as a
   share of a finisher's damage. Assassination's version of this rule is
   expected to fail the premise check (the weaker player and the 99th
   percentile did the same), so expect the same here.
4. **Secret Technique and the Shadow Blades setup** (merging the timing,
   availability, alignment and cooldown-bar rows): value a skipped or
   late Secret Technique, and a Shadow Blades cast with it down. Needs a
   haste-scaled cooldown measured from the log; top players hold it for
   Shadow Blades on purpose, so the premise is likely to fail for
   anything but a clearly skipped cast.
5. **Vanish and Find Weakness**: needs the enemy debuff. Low value, and
   the cooldown has no known per-use damage value for this spec.
6. **Dance entry energy**: mostly already visible as an idle GCD; build
   only if a page and a log disagree with the gap check.

The window-filling, active-time and stealth-cast rows are `wrong` because
the idle they grade is already counted by `checkGcdGaps`; they need no
candidate.
