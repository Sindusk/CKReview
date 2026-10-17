# WoWAnalyzer audit: shared core

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13; retail 12.1.0 in `src/game/VERSIONS.ts`),
  read 2026-10-16. Records extracted by a Sonnet subagent, spot-checked
  (AlwaysBeCasting downtime and small gaps, CastEfficiency defaults: 3 of 3
  matched their source); reconciled in the main session. Reference only
  (AGPL): every record is in our own words, no ids or tables taken.
- **Layout:** the old `src/parser/core/modules/` is gone. AlwaysBeCasting,
  CastEfficiency, SpellUsable, Haste, CancelledCasts, DoT and resource
  helpers are in `src/parser/shared/modules/`; the priority-list checker in
  `src/parser/shared/metrics/apl/`; graded guide panels in
  `src/interface/guide/`. There is no Checklist any more: threshold getters
  (minor / average / major) feed each spec's guide.
- **App side:** `lib/damage/checks.ts` (generic checks),
  `lib/damage/wow/specs/shared.ts` (burst windows, DoTs, resources),
  `lib/damage/wow/specs/potion.ts`, `lib/damage/wow/tracked-cooldowns.ts`,
  `lib/damage/wow/haste.ts`, `lib/damage/pace.ts`.

**One fact decides most of this file:** every WoWAnalyzer percentage or
per-minute rule divides by the whole fight. Nothing subtracts forced
downtime, Stasis-like phases, intermissions or untargetable time; the
"adjust for downtime" toggle (off by default) removes only the player's
own death. Boss configs can hide the downtime box or draw a debuff overlay,
but neither changes a number. That is the source of the "Stasis as ready
time" and "active time includes Stasis" errors in dps-analysis.md.

Statuses here describe the **generic mechanism**. Whether it holds for a
spec, and whether it has fired on a real log, is in the spec's ledger.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| core/AlwaysBeCasting/downtime-pct | superseded | `checkGcdGaps` | none | idle time | Above 5 / 10 / 15% of the fight idle. Whole-fight denominator, Stasis included: reads 5-15 points under the app's uptime (dps-analysis.md). The app values each gap less forced time instead. |
| core/AlwaysBeCasting/small-gaps | covered | `checkGcdGaps` (`gcd-delay`, `gcd-drift`) | none | late GCDs | Gaps 0.1-2.25s, above 6 / 8 / 10 a minute. The app lists delays from 0.25s and adds shorter ones by phase; it values them rather than counting a rate. |
| core/GlobalCooldown/gcd-length | superseded | `lib/damage/wow/haste.ts` | none | — | Base GCD ÷ (1 + haste) from a hand-kept haste-buff table, floored at 0.75s. The app fits each player's GCD from the log's own cast times, which reproduced Bloodlust and Power Infusion. |
| core/GlobalCooldown/accuracy-gate | no-damage | — | none | — | Hides the active-time box at 2+ GCD overlaps a minute. Display only. |
| core/CastEfficiency/cooldown-efficiency | covered | `checkCooldownDrift` + tracked-cooldowns.ts | per spec | a cooldown held past ready | Share of the fight the ability was unavailable; flags below 80% (average −5, major −15 points; each spec can override). **Overstates:** Stasis and other forced time count as ready, and the last use is expected even when the fight ends first. The app counts whole lost uses less forced time; check a "missed" use with the damage-analysis skill's `tools/cooldown.js` before believing it. |
| core/CastEfficiency/filler-rate | superseded | `checkGcdGaps`, `lib/damage/pace.ts` | none | — | Optional: casts of a cooldown-less spell over the whole fight ÷ its GCD. The app counts idle and pace instead. |
| core/MajorCooldown/missed-uses | covered | `checkCooldownDrift` | per spec | a skipped major cooldown | Possible uses come from cast efficiency (same whole-fight denominator); the first half of the unused ones are "ok", the rest "fail". The app needs one whole lost use. |
| core/MajorCooldown/per-use-rating | — | — | per spec | — | A framework: each use is graded by its worst spec-defined check. Judged in the spec ledgers. |
| core/SpellUsable/cooldown-model | superseded | `chargesAt` / `cappedStretches` (checks.ts) | per spec | — | Cooldown reductions and resets are written into each spec's code, since the log doesn't show them; a missed source skews efficiency both ways. The app fits recasts from the log (tracked-cooldowns.ts comments) and `spentCooldownDrift` for resource-recharged ones. |
| core/PrePullCooldowns/inferred-casts | covered | `roomForUses` (prePull) | none | an opener cooldown cast before the pull | Infers a pre-pull cast from a buff already up at the pull and credits it. The case study found WoWAnalyzer still missing some (Soul Fire); its priority-list checker ignores pre-pull casts entirely. |
| core/CancelledCasts/cancel-rate | covered | `checkInterrupts` | none | a cast cut by movement | Cancelled ÷ all cast-time casts, above 2 / 5 / 15%. Opt-in per spec. Counts boss interrupts and stuns too. The app counts the idle, not a rate. |
| core/DeathTracker/time-dead | covered | `checkDeaths` | none | any death | Any time dead is major. |
| core/CombatLogParser/fight-duration | superseded | forced windows (`ctx.forced`) | none | — | See the fact above. A user can filter a report to one phase by hand; nothing automatic. |
| core/DowntimeDebuff/overlay | superseded | `DamageContext` forced and movement windows | none | — | Draws boss-debuff windows on the timeline; never subtracted. |
| core/MeleeUptime/swing-gap | candidate | — | none | a melee player out of range of the boss | Predicts each auto-attack from recent swing timing; a swing 100ms+ late is downtime. Under 98 / 90 / 80%. Log-visible. Doubts: it can't tell an untargetable boss from a player out of range, and most out-of-range time is mechanics (movement leniency). Worth it only for time out of range with no forced window. |
| core/DebuffUptime/target-uptime | covered | `dotUptimeFindings` | per spec | a DoT left off | Time any enemy carries the debuff ÷ the whole fight, under 85 / 80 / 75% (specs override). Pooled over enemies, so cleave coverage isn't scored. The app measures from first application, less forced time. |
| core/EarlyDotRefreshes/pandemic | candidate | — | per spec | a DoT refreshed with more than 30% of its duration left | The duration past the 30% carry-over is wasted; the cast is bad if no target refreshed cleanly. Thresholds per spec. Log-visible. The app has no early-refresh check for WoW. Value it by the duration lost, as the FFXIV side does, not as a share of casts. |
| core/AoESpellEfficiency/hits-per-cast | candidate | — | per spec | an AoE spell cast into fewer targets than it could hit | Hits ÷ the best hit count seen per cast, under 95 / 90 / 80%. Target count is guessed from the player's own hits. The app has no WoW AoE check. Opt-in; decide per spec. |
| core/ExecuteHelper/execute-windows | — | — | per spec | — | A helper for execute-range rules; judged in the spec ledgers. |
| core/ResourceTracker/waste | covered | `resourceCapFindings`, `primaryResourceCapFindings`, `spenderSnapshotWaste` | per spec | gains into a full bar | Generated, spent and wasted per ability; thresholds are each spec's. |
| core/ResourceTracker/regen-cap | unverifiable | — | per spec | Energy / Focus at the cap | Predicts passive regen lost at the cap. The log shows only casts made at the cap (dps-analysis.md). |
| core/PotionChecker/combat-potions | verified | `combatPotion` (potion.ts) | none | a potion not drunk with room for it | One at the pull plus one per full 5 minutes after a 25s allowance. Matched on qpZx3mWaG7gcDdYB (Shadowmeld 1 of 2; Imnotanorc too). The app needs 20s left alive, not WoWAnalyzer's whole-fight count, and values the potion from the log. |
| core/Consumables/prep | no-damage | — | none | — | Flask, food, augment rune, enchants, gems, weapon oils, Vantus rune. Damage, but preparation, not play; the app doesn't grade gear. See open question below. |
| core/APL/priority-check | superseded | the spec checks | per spec | casts out of the spec's priority order | Each cast of a listed spell is checked against the first rule that applies; "frequently skipped" needs over 40% of that rule's chances. **Single-target:** a target-count condition can only permit a cast, never flag a missed cleave; out of range never counts; pre-pull casts are ignored. Its accuracy doesn't translate to damage on cleave (dps-analysis.md). Each spec's priority rules are listed in its ledger and judged one by one. |
| core/healing-and-defence | no-damage | — | — | — | Healer active time and non-heal share, mana left, health potions, Healthstone, dispels, mitigation checks, death recap, distance moved (display only). |

Not rules (infrastructure, no grade of their own): GCD-overlap counter,
active-time union and windowed active time, death-downtime history, the
deprecated max-casts path, resource-usage charts, performance-score and
rating combiners, the cooldown bar, the "use every cooldown" section, the
priority-list helpers (optional conditions, range guess).

## What a spec can configure

Phase 2 reads a spec's choices against these hooks:
- **Abilities** (spellbook): cooldown (fixed or haste-scaled), charges,
  GCD, and per ability whether cast efficiency is graded and its target
  (`recommendedEfficiency`, average / major steps).
- **SpellUsable**: cooldown reductions, resets and charge changes from
  talents and procs.
- **AlwaysBeCasting**: its thresholds. No hook to exclude time.
- **CancelledCasts**: opt-in, with ignored abilities.
- **DebuffUptime / EarlyDotRefreshes**: which DoTs, durations, thresholds.
- **ResourceTracker**: the resource, max, regen, cost changes; spec-owned
  thresholds.
- **MajorCooldown**: per-use checks.
- **Priority list**: the rules and their conditions.

## Open question for the user

- **Consumables and gear at the pull** (flask, food, rune, enchants,
  gems): WoWAnalyzer grades them; the app doesn't. Out of scope, or a
  later check?
