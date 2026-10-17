# WoWAnalyzer audit: Elemental Shaman

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16. Records extracted by
  Sonnet subagents (Shaman shared layer, then the spec), spot-checked
  (Flame Shock refresh / uptime / Lava Burst count, Chain Lightning
  targets, Maelstrom waste tiers, cast-efficiency targets: 6 of 6
  matched); reconciled in the main session. Pilot spec of the WoW audit.
  Reference only (AGPL): our own words, no ids or tables taken.
- **Spec:** declares 12.1.0, fully maintained; last change 2026-09-18
  (Call of the Ancestors section). No priority list and no checklist:
  every grade is a guide section. Most modules have no changelog entry of
  their own, so their patch is the 2025-12-17 "Updated for Midnight".
- **App:** `lib/damage/wow/specs/ranged.ts` (`"Elemental Shaman"`:
  Ascendance window, Maelstrom at the cap, Flame Shock uptime),
  `tracked-cooldowns.ts` (Ascendance), `potion.ts`, generic checks.
  Case study: qpZx3mWaG7gcDdYB pull 3 (Cocroach, 30th percentile) against
  JZjf9x3mK76NzabP fight 9 (Nickshockz, 99th), both pages saved; the
  header of ranged.ts records what matched.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Elemental sets or
  adds.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| shaman-elemental/AlwaysBeCasting/active-time | superseded | `checkGcdGaps` | none | idle time | Below 95 / 85 / 75% of the whole fight. Case study: 75.0% vs 81.4%, which the app shows as small delays (18.1s, 2.32M) and gaps. |
| shaman-elemental/CancelledCasts/rate | covered | `checkInterrupts` | none | a cast cut by movement | Above 5 / 7.5 / 10%. Not shown in the guide. |
| shaman-elemental/MaelstromDetails/waste | verified | `primaryResourceCapFindings` | none | Maelstrom generated into a full bar | Wasted ÷ generated, above 0 / 2 / 5%. Case study 2.7% vs 2.2%, both pages matched. WoWAnalyzer's cap leaves out Primordial Capacity; the app reads the max from the log. |
| shaman-elemental/MaelstromSpenders/waste-since-last | covered | `primaryResourceCapFindings` | none | capping between spenders | The same waste, scored per spender (worst at 25+ wasted). |
| shaman-elemental/MaelstromSpenders/spender-before-lava-burst | candidate | — | Master of the Elements | a spender cast without Master of the Elements while Lava Burst sat ready | Scored from ready time (worst at 10s+). "Missed opportunity" at 5s+; any one fails the overview counter. Log-visible: Lava Burst casts and Lava Surge buffs are logged, so the charges can be rebuilt from casts. Lost = the spender's Master of the Elements bonus, measured from the player's buffed vs unbuffed spenders. Doubts: its ready clock starts at the pull and resets only when the last charge is spent, so the first spender and spenders between two charges can read late. Movement where only an instant spender fits isn't excused. Premise check needed on top parses. |
| shaman-elemental/FlameShock/uptime | verified | `dotUptimeFindings` (Flame Shock) | none | Flame Shock left off | Under 99 / 95 / 85% of the whole fight, pooled over enemies. Shown, not graded, in Elemental's guide. Case study 99.5% both. |
| shaman-elemental/FlameShock/early-refresh | candidate | — | none | Flame Shock refreshed with more than 30% left | Bad casts over 10 / 20 / 30% of Flame Shock casts. The shared core pandemic rule (core.md). Fixed 18s duration, so a talent that changes it is misjudged. Value the duration lost, not a share. |
| shaman-elemental/FlameShock/lava-burst-unshocked | candidate | — | none | Lava Burst landing on an enemy without Flame Shock | Counted, no tier. Lava Burst only crits for certain on a Flame Shocked target. Log-visible (the target's debuffs at the hit). Lost = the player's Lava Burst crit vs non-crit, times the share that didn't crit. Doubt: it judges at the hit, not the cast; a fresh add or travel time can flip it. |
| shaman-elemental/SubOptimalChainLightning/one-target | candidate | — | none | Chain Lightning hitting one target | Above 0 / 1 / 2 a minute; a timeline note, not in the guide. Lost = Lightning Bolt's average minus that Chain Lightning. Doubts: it flags every Chain Lightning on a single-target boss, including Stormkeeper-buffed or moving casts. Premise check: whether top players ever cast it into one target. |
| shaman-elemental/Ascendance/window-downtime | covered | `burstGcdFindings` (Ascendance) + `checkGcdGaps` | Ascendance | idle in Ascendance | Under 0.5 / 1.25 / 2s per window. Counts forced movement and windows cut by death or the kill; the app values the missing GCDs at the window's bonus, less forced time. |
| shaman-elemental/Ascendance/window-spenders | candidate | — | Ascendance | Maelstrom held through Ascendance | Spenders cast vs what the starting Maelstrom plus what was generated could pay for; 0 / 1 / 2 / 3+ missed. Unspent Maelstrom isn't lost (it's spent later, or capped, which the cap check counts), so the loss is only the Ascendance bonus on a spender moved out. Low value; build only if a page and a log disagree with the cap check. |
| shaman-elemental/Ascendance/window-non-overload | candidate | — | Ascendance | Flame Shock, Frost Shock or other GCDs that can't overload, cast inside Ascendance | 0 / 1 / 2 / 3+ per window; a Voltaic Blaze hitting 2+ targets is excused (Purging Flames). Lost = the window's average overload GCD minus that cast. Doubts: a Flame Shock forced by a new target or an instant forced by movement is still counted. |
| shaman-elemental/Ascendance/window-overall | superseded | — | Ascendance | — | The average of the three marks above, rounded down. |
| shaman-elemental/CallOfTheAncestors/active-time | wrong | `checkGcdGaps` | Call of the Ancestors (Farseer) | idle while Ancestors are out | Above 95 / 85 / 75% active per window. The same idle the gap check counts, graded a second time (case study: 24 of 41 "bad" vs 8 of 38, all idle). Counts forced time too. |
| shaman-elemental/CallOfTheAncestors/other-checks | no-damage | — | Call of the Ancestors | — | What summoned them, damage per Ancestor, a timeline; always "perfect". |
| shaman-elemental/Abilities/ascendance-efficiency | verified | `checkCooldownDrift` (Ascendance, 120s) | Ascendance; First Ascendant (180 → 120s) | Ascendance held | 90% target, whole-fight. Case study matched on both players. |
| shaman-elemental/Abilities/stormkeeper-efficiency | candidate | — | Stormkeeper; Herald of the Storms, Rolling Thunder (−15s each); Offering From Beyond | Stormkeeper held | 90% target. Not tracked: its intervals spread too far (38.2 / 48.9s, tracked-cooldowns.ts). Offering From Beyond takes 3s off per Ancestor summoned, which may explain the spread. Summons are in the log, so a fit of interval against summons (like `spentCooldownDrift`) could track it. The case study's Stormkeeper matched by count. |
| shaman-elemental/Abilities/elemental-blast-efficiency | superseded | `primaryResourceCapFindings` | Elemental Blast | — | 60% target with no cooldown declared; in Midnight it's a Maelstrom spender, so how often it's cast is set by Maelstrom. Unspent Maelstrom is the cap check's. |
| shaman-elemental/PowerOfTheMaelstrom/stacks | covered | `checkProcs` (expiries) | Power of the Maelstrom | stacks left to expire | A statistic only, no grade. Stacks gained at the max aren't in the log (unverifiable part). Whether `checkProcs` picks it up as a proc on an Elemental pull: phase 3. |
| shaman-elemental/S2TierSet/overcharge | no-damage | — | Midnight season 2 tier set | — | Credited damage and "Overcharge refreshed" counts in a tooltip, no grade. Revisit if a page shows it mattering. |
| shaman-elemental/statistics | no-damage | — | — | — | Display only: Master of the Elements buffed-cast table, Stormkeeper damage while buffed, Aftershock refunds, Offering From Beyond effective CDR, Maelstrom graph, cooldown graphs, the Ascendance advice text (Stormkeeper before Ascendance, no Flame Shock inside). |
| shaman-shared/utility | no-damage | — | — | — | Astral Shift, Earth Shield, Earthen Harmony, Elemental Orbit, Mana Spring, Nature's Guardian, Spirit Wolf, Static Charge, Spiritwalker's Grace (case study: 4 vs 6, movement), Earth Elemental, Lightning Shield (0% target, inert). Utility and defensives aren't judged. |

Not rules (models the rules above rest on): Maelstrom tracker and costs
(Eye of the Storm), Lava Surge resetting Lava Burst, event links and
reordering, the pre-pull Ancestor normalizer (fixed 6s, +4s with Heed My
Call), Ancestor window merging. An unregistered Haste file is dead code.

## Candidates, by expected value

1. **spender-before-lava-burst**: the spec's main rotation rule and the
   one WoWAnalyzer grades hardest; log-visible. Needs the charge rebuild
   and a premise check on top parses.
2. **stormkeeper-efficiency**: one cooldown the app doesn't track, if
   Offering From Beyond explains the spread.
3. **window-non-overload**, **lava-burst-unshocked**, **one-target**
   Chain Lightning: small per cast; build only if they fire on weaker
   logs.
4. **early-refresh**: generic; better done once in shared.ts for every
   spec with DoTs.
5. **window-spenders**: low value (see row).
