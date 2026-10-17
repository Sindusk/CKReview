# WoWAnalyzer audit: Unholy Death Knight

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Death Knight shared layer,
  then the spec), spot-checked at their source lines (4 of
  4 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares patch 12.0.7, one minor patch behind the clone's
  12.1.0: lagging. Partially maintained; last change 2026-05-29 (the Sudden
  Doom proc-window analysis). No priority list and no checklist: every
  grade is a guide section (Plague, Festering Scythe, Putrefy, Scourge
  Strike, Soul Reaper, Sudden Doom, Active Time). Several threshold getters
  inside enabled modules have no reader and grade nothing. Rules touching
  talents that have since changed (hero talent names: Forbidden Knowledge,
  Commander of the Dead, Harbinger of Doom) are doubtful until rechecked
  against current game data.
- **App:** `lib/damage/wow/specs/melee.ts` (`"Unholy Death Knight"`: the
  Dark Transformation window and Runic Power at the cap, nothing else),
  `tracked-cooldowns.ts` (Dark Transformation, Army of the Dead),
  `potion.ts`, generic checks. No case study: melee.ts counts three Unholy
  players in its survey, and no WoWAnalyzer page was ever compared. So
  nothing here is `verified`.
- **Phase 3:** not started.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Unholy sets or
  adds. The class layer (rune overcap and efficiency, runeforge flag) is
  folded in here, since only Unholy and its siblings read it.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| deathknight-unholy/AlwaysBeCasting/downtime-pct | superseded | `checkGcdGaps` | none | idle time | Loosened to 10 / 15% idle (core default is 5 / 10 / 15%) because pets and movement cost uptime. Whole-fight denominator, forced time counted as idle. |
| deathknight-unholy/PlagueEfficiency/dread-coverage | candidate | — | Dread Plague; Forbidden Knowledge | Dread Plague missing while Virulent Plague is up | Ratio of the two uptimes, Perfect at 100%, fails below 98%. The app has `dotUptimeFindings` (used for Blood Plague and the casters) but no Unholy DoT check at all, not even Virulent Plague alone. Value: the Dread Plague gap in seconds times the player's damage per second from Dread Plague (and its Sudden Doom feed, which is hard to value). Both uptimes pool over every enemy, so cleave fights mix targets; the app would measure per target from first application, less forced time. A pause where only one disease falls off is counted against the player in WoWAnalyzer. Expected value: moderate for Virulent alone, low for the ratio; most players keep both up. What would separate a mistake: top players with the same gap on the same boss. |
| deathknight-unholy/FesteringScythe/refresh-timing | candidate | — | Festering Scythe; Lesser Ghoul | buff refreshed early | Grades how late each refresh was (under 3s left Perfect, 5s or more left Ok), with a fixed 25s duration assumed and an override that makes any refresh Perfect while holding at most one Lesser Ghoul stack, which hides real waste. Indirect damage (it feeds Sudden Doom). Value would be the remaining duration thrown away, but the buff's damage is not directly measurable from the log, so it's an uptime proxy only. Low value; the hard-coded duration may be stale (lagging patch). |
| deathknight-unholy/FesteringScythe/buff-drop | candidate | — | Festering Scythe | buff expiring and reapplied later | Any gap counts equally, including time the player can't cast (Stasis, intermission), and the first apply isn't a drop. Value would be the gap length times the buff's effect, which isn't read from the log. Low value; build only if the buff turns out to carry measurable damage. |
| deathknight-unholy/Putrefy/charges-in-dark-transformation | candidate | — | Putrefy; Putrid Echoes; Dark Transformation | a Putrefy charge spent with no Dark Transformation up | Efficiency of charges spent inside the window, goal 100%. Depends on a hand-kept model where a Soul Reaper cast consumes up to two charges (the log shows only casts), so phantom charges can be counted as misses. Value: the damage difference between a Putrefy inside the window and one outside, from the player's own casts (the window's bonus read by `observedWindowBonus` style inside vs outside). Doubtful: top players likely spend outside the window when charges would cap. What would separate a mistake: charges spent outside while the player was not at the cap and Dark Transformation was within a few seconds of ready. |
| deathknight-unholy/ScourgeStrike/cast-with-lesser-ghoul-stacks | candidate | — | Scourge Strike; Lesser Ghoul | a Scourge Strike cast with no Lesser Ghoul stack | Share of casts made with one or more stacks, goal 100%. Log-visible from cast plus buff stacks. Value: the player's damage on stacked vs stackless casts (both measured), times the stackless count. Stack removal at the same timestamp as the cast can read as zero, so a tolerance is needed. Expected value: low to moderate; stackless casts are often forced by Lesser Ghoul timing and a ready rune. |
| deathknight-unholy/SoulReaper/free-cast-per-dark-transformation | candidate | — | Soul Reaper; Dark Transformation | a Dark Transformation window with no Soul Reaper cast | Boolean per window. The "free cast" itself is the spec's comment; no code or cooldown model resets Soul Reaper, so check the claim in a log before building. Value: the player's average Soul Reaper damage per missed window. Cheap to build with the window the app already reads. Pre-pull windows (already up at the pull) are never tracked by WoWAnalyzer. |
| deathknight-unholy/SoulReaper/outside-dt-discipline | wrong | — | Soul Reaper; Putrefy; Dark Transformation | Soul Reaper cast outside the window with Putrefy charges held or Dark Transformation within 15s | Uses the log's future (the next Dark Transformation cast), which a player can't know, and fails execute-range casts on cooldown. Judges a held-for-later choice with hindsight. |
| deathknight-unholy/SuddenDoom/proc-consume-speed | wrong | — | Sudden Doom; Death Coil; Epidemic; Necrotic Coil; Graveyard | a proc held more than two casts | Bands of 2 / 4 casts between gaining and spending. Slower is never penalised in the app: holding a proc for a better spender or a burst is a choice, and speed to spend has no direct loss. The real loss (expired or overwritten) is `checkProcs`'. Stack handling for two-stack procs was reworked twice, so counts are also unreliable. |
| deathknight-unholy/SuddenDoom/waste-rate-thresholds | covered | `checkProcs` (expiries) | Sudden Doom | procs expired or overwritten | Dead in WoWAnalyzer: no consumer reads the getter (10 / 20 / 30% wasted). Whether `checkProcs` treats Sudden Doom as a proc buff on an Unholy pull is untested (phase 3). Overwrites at two stacks aren't expiries and may be missed. |
| deathknight-unholy/Abilities/dark-transformation-efficiency | covered | `checkCooldownDrift` (Dark Transformation, 45s) + `burstGcdFindings` | Dark Transformation | Dark Transformation held | No declared target; cooldown graph only. Tracked at the survey's shortest interval (45.1 / 46.5s median). WoWAnalyzer counts forced time as ready. |
| deathknight-unholy/Abilities/army-of-the-dead-efficiency | covered | `checkCooldownDrift` (Army of the Dead, 91s) | none | Army of the Dead held | Graph only, no grade. Survey 91.1 / 95.2s. |
| deathknight-unholy/Abilities/putrefy-efficiency | candidate | — | Putrefy; Putrid Echoes; Harbinger of Doom | Putrefy charges lost to capping | Not tracked: it has charges, and its recharge is cut by Harbinger of Doom (each Lesser Ghoul summoned removes 2.5s) and Soul Reaper casts spend its charges. A candidate through `spentCooldownDrift` with a fixed reduction per Lesser Ghoul summoned (`reduceOn`) and the 30s base; the Soul Reaper link is a model, not log data, and the three-charge cap is a Putrid Echoes fact. Doubtful if either talent changed since 12.0.7. Value: a charge's damage from the player's own Putrefy hits. Expected value low; most of the rule is the Dark Transformation timing above. |
| deathknight-unholy/Abilities/soul-reaper-efficiency | superseded | `checkCooldownDrift` | Soul Reaper | — | No target; the possible-cast count is built from windows and execute time, not the cooldown, and is display only. The modelled reset by Dark Transformation is a comment, not code. |
| deathknight-unholy/RunicPowerDetails/waste-thresholds | covered | `primaryResourceCapFindings` | none | Runic Power generated into a full bar | Dead in WoWAnalyzer (wasted share above 5 / 10 / 15%); the guide only advises avoiding the cap. The app reads Runic Power as the primary resource. WoWAnalyzer doesn't model Sudden Doom changing a spender's cost; waste while the player can't cast (Stasis) is counted there. |
| deathknight-unholy/RuneTracker/rune-efficiency-thresholds | no-damage | — | Runic Corruption | — | Dead: looser than the class default (15 / 25 / 35% wasted), and the guide's Runes subsection is prose plus a graph with no grade. The rune tracker infers regeneration, counts Stasis as capped time, and uses a flat Runic Corruption model. Indirect damage; the app has no rune check. |
| deathknight-shared/RuneTracker/rune-overcap-pct | no-damage | — | Runic Corruption | — | The class default (5 / 10 / 20% wasted, below 95 / 90 / 80% efficiency); Unholy's own override is the dead row above. Same model doubts; not graded for Unholy. |
| deathknight-unholy/RuneForgeChecker/disliked-runeforges | no-damage | — | none | — | Dead: the suggestion has no reader, and the list is of a legacy weapon-enchant mechanic that may no longer exist. Gear, not play. |
| deathknight-shared/RuneForgeChecker/forge-flagged | no-damage | — | none | — | Class base for the above; same. |
| deathknight-unholy/statistics | no-damage | — | — | — | Display only: Soul Reaper damage with an estimated debuff bonus (a flat fifth of the damage dealt to debuffed targets), the Putrefy donut, Sudden Doom procs a minute, Lesser Ghoul consumption, Commander of the Dead pet buff share, Unholy Aura haste, Forbidden Knowledge uptime and damage, Rune of the Fallen Crusader strength, cooldown graphs, rune and Runic Power graphs. |
| deathknight-shared/utility | no-damage | — | Anti-Magic Barrier; Assimilation; Death's Echo; Ice Prison | — | Anti-Magic Shell, Anti-Magic Zone, Icebound Fortitude, Lichborne, Death Pact, Death Grip and Death's Advance, Wraith Walk, Asphyxiate, Mind Freeze, Blinding Sleet, Chains of Ice, Raise Ally, Dark Command. Declared cooldowns only; utility and defensives aren't judged. |

Not rules (models the rules above rest on): the Putrefy cooldown model
(Soul Reaper spending charges, Putrid Echoes), the Sudden Doom event link
(a removal matched to the spending cast within half a second either side),
the Soul Reaper possible-cast model (one per Dark Transformation plus one
per 15s of execute time) and its flat 20% debuff-damage estimate, the
rune-tracker model (three two-charge stand-ins, Runic Corruption rescaling),
the Sudden Doom, Festering Scythe and Putrefy per-event record lists,
buff timeline highlights, Forbidden Knowledge as an execute helper with no
threshold, and the cooldown throughput windows. The Cooldown Tracking
guide section is a graph with no grade.

## Candidates left

None is measured. Ordered by expected value:

- **Plague / Virulent Plague uptime**: cheapest build (the check exists for
  Blood and the casters), real damage; Dread Plague's share is the
  doubtful part. Top-player gaps decide it.
- **Soul Reaper per Dark Transformation window**: cheap, windows already
  read. First verify the free-cast claim in a log.
- **Scourge Strike without a Lesser Ghoul stack**: log-visible; needs a
  same-timestamp tolerance and a top-player comparison.
- **Putrefy outside Dark Transformation / Putrefy charges**: depends on a
  guessed Soul Reaper link; likely most players spend on cap.
- **Festering Scythe refresh and drop**: indirect, hard-coded duration,
  lowest value.

Sudden Doom speed and Soul Reaper outside the window are `wrong`, not
candidates. Nothing here has been checked against a log, so every
"expected value" is a prior, not a measurement.
