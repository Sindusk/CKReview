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
- **Phase 3 (2026-10-16):** measured on Cocroach's 11 Elemental pulls of
  gVDPhzp61Zm29HMw (2026-10-13; he played Enhancement on the other 5)
  and seven top Mythic parses (Entombed Sentinels: Vr8dLPtFYWA4G1yg
  fight 39 Malegusxd, baRCnPv62YQ1dJZN fight 32 Fauni, JvQpZk3CXj78Dx2f
  fight 67 Kullingen and Spongêbob; Vashnik the Malignant:
  r9CX1kpRGLmKJH4M fight 56 Elemeta and Unlucky, 9w3bK4qhrRC82gVX fight
  29 Shaziggla). Every player had Master of the Elements, Farseer,
  Elemental Blast, Stormkeeper and Ascendance; Power of the Maelstrom on
  some. The app's checks gave the top seven no Ascendance, Maelstrom or
  Flame Shock finding (one 8k Ascendance window on Shaziggla) and fired
  on Cocroach (potions, Flame Shock 18.2s at Coiled Altar 2:56, short
  Ascendance windows). Four candidates were marked `wrong` because the
  top players did the same as often or more. That is weak evidence on
  its own (top players also lose damage). The fifth, one-target Chain
  Lightning, was re-measured as a real loss (overloads included) and is
  a candidate again.
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
| shaman-elemental/MaelstromSpenders/spender-before-lava-burst | wrong | — | Master of the Elements | a spender cast without Master of the Elements while Lava Burst sat ready | Scored from ready time (worst at 10s+). "Missed opportunity" at 5s+; any one fails the overview counter. **Fight-blind:** measured as an unbuffed spender with Lava Surge up (an instant Lava Burst ready, outside Ascendance). On Vashnik the top three did it 8, 9 and 10 times (mostly Earthquake chains on adds; 19-27 unbuffed spenders each), more than Cocroach (2-7). On Entombed Sentinels the top four did it 0-2 times, Cocroach 0. The bonus itself didn't measure: too few unbuffed Elemental Blasts outside Ascendance (0-3 a pull). |
| shaman-elemental/FlameShock/uptime | verified | `dotUptimeFindings` (Flame Shock) | none | Flame Shock left off | Under 99 / 95 / 85% of the whole fight, pooled over enemies. Shown, not graded, in Elemental's guide. Case study 99.5% both. Phase 3: none on the top seven; Cocroach Coiled Altar 2:56 (18.2s, 200k), Kith'ix 0:38 and 1:36, Nek'zali 2:01 and 3:30. |
| shaman-elemental/FlameShock/early-refresh | wrong | — | none | Flame Shock refreshed with more than 30% left | Bad casts over 10 / 20 / 30% of Flame Shock casts; the core pandemic rule (core.md). Duration confirmed 18s in the log. **Fight-blind:** on Entombed Sentinels (two bosses) the top four refreshed early 1, 4, 4 and 2 times; Cocroach 0-2 a pull. WoWAnalyzer itself marks Flame Shock a movement filler. |
| shaman-elemental/FlameShock/lava-burst-unshocked | wrong | — | none | Lava Burst landing on an enemy without Flame Shock | Counted, no tier. Measured as player Lava Bursts that didn't crit (certain crit on a Flame Shocked target): top seven 0-3 (Unlucky 3 on Vashnik itself), Cocroach 0-3 (new adds: Burning Venom, Spiteful Soulcoiler, Hex Lord Malacrass). ~75k each. No difference between top and weaker players, and it comes from target swaps. |
| shaman-elemental/SubOptimalChainLightning/one-target | candidate | — | none | Chain Lightning hitting one target | Above 0 / 1 / 2 a minute; a timeline note, not in the guide. Top seven 0-5 a pull, Cocroach 0-3. **A real loss, top players included.** Re-measured 2026-10-16 on r9CX1kpRGLmKJH4M fight 56 (Vashnik): a one-target Chain Lightning did 51.9k (Elemeta, 5 casts) and 67.2k (Unlucky, 1 cast), against a Lightning Bolt's 87.9k and 104.4k once its overloads count (23-35k a cast; none of the one-target Chain Lightnings overloaded). Non-crit direct hits 17.6k vs 25.8k, the 116 / 170 spell power ratio. The first pass compared direct damage only, on five mostly-crit casts, and wrongly found no loss. Value: each one-target cast at the player's own Lightning Bolt average, overloads included, less the cast; ~35k each, small per pull. Excuse casts where a second target was in range but out of reach of the bounce (unclear from the log). |
| shaman-elemental/Ascendance/window-downtime | covered | `burstGcdFindings` (Ascendance) + `checkGcdGaps` | Ascendance | idle in Ascendance | Under 0.5 / 1.25 / 2s per window. Counts forced movement and windows cut by death or the kill; the app values the missing GCDs at the window's bonus, less forced time. |
| shaman-elemental/Ascendance/window-spenders | candidate | — | Ascendance | Maelstrom held through Ascendance | Spenders cast vs what the starting Maelstrom plus what was generated could pay for; 0 / 1 / 2 / 3+ missed. Unspent Maelstrom isn't lost (it's spent later, or capped, which the cap check counts), so the loss is only the Ascendance bonus on a spender moved out. Low value; build only if a page and a log disagree with the cap check. |
| shaman-elemental/Ascendance/window-non-overload | wrong | — | Ascendance | Flame Shock, Frost Shock or other GCDs that can't overload, cast inside Ascendance | 0 / 1 / 2 / 3+ per window; a Voltaic Blaze hitting 2+ targets is excused (Purging Flames). **Fight-blind:** the top seven cast 0-6 a pull (Voltaic Blaze on Vashnik, Flame Shock and Stormkeeper on Entombed Sentinels), Cocroach 0-4. Top players do it as often. |
| shaman-elemental/Ascendance/window-overall | superseded | — | Ascendance | — | The average of the three marks above, rounded down. |
| shaman-elemental/CallOfTheAncestors/active-time | wrong | `checkGcdGaps` | Call of the Ancestors (Farseer) | idle while Ancestors are out | Above 95 / 85 / 75% active per window. The same idle the gap check counts, graded a second time (case study: 24 of 41 "bad" vs 8 of 38, all idle). Counts forced time too. |
| shaman-elemental/CallOfTheAncestors/other-checks | no-damage | — | Call of the Ancestors | — | What summoned them, damage per Ancestor, a timeline; always "perfect". |
| shaman-elemental/Abilities/ascendance-efficiency | verified | `checkCooldownDrift` (Ascendance, 120s) | Ascendance; First Ascendant (180 → 120s) | Ascendance held | 90% target, whole-fight. Case study matched on both players. |
| shaman-elemental/Abilities/stormkeeper-efficiency | covered | `stormkeeper` (ranged.ts, through `spentCooldownDrift`) | Stormkeeper; Herald of the Storms, Rolling Thunder (−15s each); Offering From Beyond | Stormkeeper held | 90% target. Not tracked: its intervals spread too far (38.2 / 48.9s, tracked-cooldowns.ts). **Model measured:** 60s, less 3s per Ancestor summoned (Call of the Ancestors applied or stacked) before it's ready. On the four Entombed Sentinels top players, 22 intervals were never shorter than that and were held 0.7-12s past it (median ~1.8s, the cast time and reaction). Cocroach held 38s unforced at Coiled Altar 2:32-3:21 and 34.5s at Ula'tek 1:42-2:17. All three Vashnik top players held it 15-26s and pressed it 0-2s after Imbibe (1:48, 6:00; 3:12 for two): kept for the Venom burst, now a `cooldownHoldWindows` in the Vashnik context (30s before each Imbibe to 5s after). Built 2026-10-16: pre-pull casts read from the buff dropping before the first cast (three of the top players); a use is worth its Ancestor (~300-325k, one summoned by every cast) plus what its ~2 empowered casts add. Fires once on disk: Cocroach Ula'tek 1:42 (49.4s held, 1 use, 524k); none of the top seven. |
| shaman-elemental/Abilities/elemental-blast-efficiency | superseded | `primaryResourceCapFindings` | Elemental Blast | — | 60% target with no cooldown declared; in Midnight it's a Maelstrom spender, so how often it's cast is set by Maelstrom. Unspent Maelstrom is the cap check's. |
| shaman-elemental/PowerOfTheMaelstrom/stacks | covered | `checkProcs` (expiries) | Power of the Maelstrom | stacks left to expire | A statistic only, no grade. Stacks gained at the max aren't in the log (unverifiable part). Whether `checkProcs` picks it up as a proc on an Elemental pull: phase 3. |
| shaman-elemental/S2TierSet/overcharge | no-damage | — | Midnight season 2 tier set | — | Credited damage and "Overcharge refreshed" counts in a tooltip, no grade. Revisit if a page shows it mattering. |
| shaman-elemental/statistics | no-damage | — | — | — | Display only: Master of the Elements buffed-cast table, Stormkeeper damage while buffed, Aftershock refunds, Offering From Beyond effective CDR, Maelstrom graph, cooldown graphs, the Ascendance advice text (Stormkeeper before Ascendance, no Flame Shock inside). |
| shaman-shared/utility | no-damage | — | — | — | Astral Shift, Earth Shield, Earthen Harmony, Elemental Orbit, Mana Spring, Nature's Guardian, Spirit Wolf, Static Charge, Spiritwalker's Grace (case study: 4 vs 6, movement), Earth Elemental, Lightning Shield (0% target, inert). Utility and defensives aren't judged. |

Not rules (models the rules above rest on): Maelstrom tracker and costs
(Eye of the Storm), Lava Surge resetting Lava Burst, event links and
reordering, the pre-pull Ancestor normalizer (fixed 6s, +4s with Heed My
Call), Ancestor window merging. An unregistered Haste file is dead code.

## Candidates left

- **one-target Chain Lightning**: ~35k a cast against the player's own
  Lightning Bolt with overloads, top players 0-5 a pull. Cheap to build.
- **window-spenders**: low value, not measured.

The four other candidates were marked `wrong` in phase 3 (above). Measured with
a scratch script, not kept: per player and pull it counted unbuffed
spenders with Lava Surge up, non-crit Lava Bursts and whether the target
had the player's Flame Shock, Chain Lightning targets per cast,
non-overload casts in Ascendance, early Flame Shock refreshes and
Stormkeeper intervals against Ancestor summons.
