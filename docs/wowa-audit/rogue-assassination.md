# WoWAnalyzer audit: Assassination Rogue

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Rogue shared layer,
  then the spec), spot-checked at their source lines (3 of
  3 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** stale. It declares patch 12.0.0 while the clone's retail is
  12.1.0, and is only partly maintained (the overview admits a missing
  Implacable module). Last substantive change 2025-04-09 ("Spells
  adjusted and partial support for 12.0.0"); the Envenom and finisher
  work dates from 2023-11, the Mutilate checks and the experimental
  Kingsbane analysis from 2023-12. No priority list and no checklist:
  every grade is a guide section or a cast-efficiency target. Rules that
  lean on talents or numbers that may have changed since (Subterfuge,
  Crimson Tempest as a builder, the Sepsis buff, Without a Trace, the
  Garrote and Rupture duration models) are marked doubtful, not turned
  into candidates.
- **App:** `lib/damage/wow/specs/melee.ts` (`"Assassination Rogue"`: the
  Kingsbane window through `burstGcdFindings`, and the energy cap through
  `primaryResourceCapFindings`), `tracked-cooldowns.ts` (Kingsbane,
  Deathmark, Vanish with its Garrote value and opener use), `potion.ts`,
  generic checks. There is no Rupture or Garrote uptime check for this
  spec. Case study: qpZx3mWaG7gcDdYB pull 3 (Nearby) against
  ACmXHMFtaPLR9k8w (Auxeus, 99th percentile); the header of melee.ts
  records what matched.
- **Core rules** (active time, cast efficiency, potions) are in
  [core.md](core.md); the Rogue shared layer (combo point and energy
  waste, finisher tracker, instant poison) is judged in the rows below.
  Rows cover only what Assassination sets or adds.
- **Phase 3:** not started.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| rogue-assassination/AlwaysBeCasting/downtime-pct | superseded | `checkGcdGaps` | none | idle time | Overrides the core thresholds to 40 / 45 / 50% of the whole fight, so it practically never fires. The app values each gap less forced time. |
| rogue-assassination/Abilities/deathmark-cast-efficiency | covered | `checkCooldownDrift` (Deathmark, 122s) | Deathmark | Deathmark held | 90% target, whole fight, a hard-coded 2 minutes. WoWAnalyzer counts forced time as ready and expects a last use even if the fight ends first; the app counts whole lost uses less forced time. Case study: Deathmark similar for both players. |
| rogue-assassination/Abilities/kingsbane-cast-efficiency | covered | `checkCooldownDrift` (Kingsbane, 60s) | Kingsbane | Kingsbane held | 90% target, whole fight, same overstatement. The measured 60s agrees with the hard-coded minute. Holding it to line up with Deathmark is penalised here and by the alignment row below. |
| rogue-assassination/Abilities/vanish-cast-efficiency | verified | `checkCooldownDrift` (Vanish, `valuePerUse`, `openerUse`) | Without a Trace (a charge, doubtful) | Vanish held or the opener use skipped | 90% target. Case study matched: Nearby 61% with the opener use skipped; the app values a use as the Garrote it empowers (784k) less an ordinary Garrote. WoWAnalyzer cannot see Vanish held for adds or an untargetable phase. |
| rogue-assassination/Guide/CooldownGraph/use-on-cooldown | superseded | `checkCooldownDrift` | Kingsbane, Deathmark | a cooldown held a whole recharge | The same efficiency bars drawn on a graph, with gaps of a full cooldown shown red. The gap highlight counts forced time too. |
| rogue-assassination/Guide/EnergyCapWaste/percent-at-cap | covered | `primaryResourceCapFindings` | Vigor | Energy generated into a full bar | Perfect to 5%, good to 10%, ok to 15%, fail above. The app sees only non-spending casts made at the cap; regen lost while capped isn't in the log (unverifiable part). Case study: 4.0% vs 0.7%, both "perfect"; not adopted. Pooling for Deathmark or Kingsbane is penalised. |
| rogue-shared/EnergyCapTracker/regen-lost-at-cap | unverifiable | — | Vigor | passive regen lost at the cap | Predicted, not logged (core.md, ResourceTracker regen-cap). Merged into the energy row above for the part the log shows. |
| rogue-shared/EnergyDetails/wasted-generator-energy | covered | `primaryResourceCapFindings` | none | energy gains at a full bar | Event-based gains only, kept share below 95 / 90 / 80%. The app's cap check sees the same casts. |
| rogue-shared/ComboPointDetails/wasted-cp | candidate | — | stratagem talents | generators landing at max combo points | See "Candidates left". The combo-point waste of Assassination's builders, valued by the finisher damage it delays. The own tooltip admits some bonus-point waste can't be avoided. |
| rogue-assassination/BuilderUse/wasted-builder | candidate | — | none | a builder that gained no points at max | Counts only builders that gained nothing; Garrote and Shiv at the cap are often right. Same measurement as the row above; merge them. |
| rogue-assassination/FinisherUse/low-cp-finisher | candidate | — | Echoing Reprimand, Deeper Stratagem | Envenom or Rupture below the combo cap | Target is a fixed 5 (ignores the 6th point); the first 30 seconds are excused; Kidney Shot and Slice and Dice are counted by mistake. Value by the finisher's missing combo points. Case study: Envenom 20 bad vs 25 for the 99th percentile, so no difference there. |
| rogue-assassination/Envenom/spend-cps | candidate | — | Echoing Reprimand | Envenom below 5 combo points | The same measurement as the finisher row (merge). No allowance for the opener or a dump before Vanish. |
| rogue-shared/FinisherTracker/inefficient-finishers | superseded | — | stratagem talents | finishers under the recommended points | A third copy of the finisher rule (the spec's own version above replaces it). |
| rogue-assassination/Envenom/rupture-time-left | candidate | — | none | Envenom cast while Rupture is nearly gone or absent | Fails under 3 seconds of Rupture left, including none. Needs a Rupture timeline from the log; value by the Rupture time lost. A boss that leaves the target list makes Rupture look absent. |
| rogue-assassination/RuptureUptimeAndSnapshots/clip-and-downgrade | candidate | — | Echoing Reprimand, Deeper Stratagem | Rupture recast with time left | The pandemic rule (core.md) with hard-coded durations (doubtful for 12.0). The snapshot-downgrade branch has no snapshot source registered, so it likely never fires. Value by the duration overwritten, as the FFXIV side does. |
| rogue-assassination/GarroteUptimeAndSnapshots/clip-and-downgrade | candidate | — | Improved Garrote | Garrote refreshed outside stealth while a stealth Garrote has time left | Duration model flat 18s and a stealth snapshot window of 3s; the Sepsis clause is stale. The app already values the Vanish Garrote, so what's left is the refresh that drops the stronger one. |
| core/DebuffUptime (Rupture, Garrote) | candidate | — | none | a DoT left off | Neither bleed has an uptime check in the app (`dotUptimeFindings` isn't wired for this spec). WoWAnalyzer shows both as ungraded bars. Needs the bleed status ids from our own logs. |
| rogue-assassination/HitCountAoE/fan-of-knives-targets | candidate | — | Blindside | Fan of Knives into one or two targets | Needs two or more targets, three with Blindside. Case study: Fan of Knives on one target 56% vs 51%, similar for both players. Hits come from damage, so immune targets count as misses. No separate app check for it. |
| rogue-assassination/CrimsonTempest/spread-check | wrong | — | Crimson Tempest | Crimson Tempest with no enemy carrying both bleeds | Passes whenever any one enemy has both, so on one target it nearly always passes; it does not test that the spread did anything. Treated as a builder, which may be outdated (doubtful). |
| rogue-assassination/CrimsonTempest/combo-points-waste | candidate | — | Crimson Tempest | cast at max combo points | Same measurement as the builder row (merge); doubtful on talent drift. |
| rogue-assassination/Mutilate/no-mutilate-in-subterfuge | candidate | — | Subterfuge | Mutilate while Subterfuge is active | Reads the buff at the exact cast time with no latency tolerance. Doubtful: Subterfuge may be gone from the tree. Cast-id based, so cheap, but only worth it if the talent exists. |
| rogue-assassination/Mutilate/no-mutilate-in-vanish | wrong | — | none | Mutilate within 3s of Vanish | The event link is declared from Envenom to Vanish, not from Mutilate, so the check likely never fires. The 2023-12 changelog's Blindside and Shadow Dance Mutilate checks aren't in the file. |
| rogue-assassination/Deathmark/kingsbane-alignment | wrong | — | Kingsbane, Deathmark | Deathmark cast more than 2s from a Kingsbane | With a 60-second Kingsbane and a 120-second Deathmark, only every second Kingsbane lines up, so the rule demands Kingsbane be held for Deathmark and contradicts its own use-on-cooldown row. Whether top players pool it isn't measured. |
| rogue-assassination/Deathmark/improved-garrote-and-vanish | covered | `vanishGarroteValue` (tracked-cooldowns.ts, Vanish) | Improved Garrote, Deathmark | Deathmark without Improved Garrote while Vanish was ready | The app values a Vanish by the Garrote it empowers, which is the same thing seen from the Vanish side. The Deathmark pairing itself isn't checked. Rank combiner hides the "ok" outcome. |
| rogue-assassination/Kingsbane/valid-target | no-damage | — | Kingsbane | — | Fails a Kingsbane with no resolved enemy; a parser-level check. Hidden behind a default-off session toggle. |
| rogue-assassination/Kingsbane/deathmark-window | wrong | — | Deathmark, Kingsbane | Kingsbane cast while Deathmark is ready | Contradicts the cooldown rules, uses a buff test at the wrong time, and sits behind the experimental toggle. The comments record a sequence from a player that isn't implemented. |
| rogue-assassination/Kingsbane/shiv-after | unverifiable | — | Shiv, Kingsbane | no Shiv within 2s after Kingsbane | The code's own warning says the timing is inaccurate (the real rule ties the Shiv to the first Kingsbane application expiring). Toggle-hidden. The envenom-uptime-in-window check is a stub. |
| rogue-shared/InstantPoison/proc-rate | no-damage | — | none | — | Poison hits over melee hits, below 20 / 15 / 10%. A luck measure. |
| rogue-assassination/statistics | no-damage | — | — | — | Display only: DoT uptimes and snapshot share, Envenom and bleed uptime bars, per-cast colour breakdowns, builder and spender donuts, energy and combo graphs, damage inside Deathmark windows, Echoing Reprimand and Deeper Daggers figures. |
| rogue-shared/utility | no-damage | — | — | — | Crimson Vial, Evasion, Feint, Cloak of Shadows, Shroud of Concealment, Blind, Kidney Shot, Sprint, Shadow Step, Thistle Tea, Kick, Tricks of the Trade, Grappling Hook. Cooldowns declared for tracking only. Utility and defensives aren't judged. |

Not rules (models the rules above rest on): the combo point and energy
trackers (cap 5 plus the stratagem ranks, energy cap and regen scaled by
Vigor, Shadow Focus cost reduction), Garrote, Rupture and Crimson Tempest
duration models, the Improved Garrote snapshot definition, the stealth
helpers and stealth damage tracker, the event links (cast to debuff and
damage, Deathmark to Kingsbane, Deathmark to Improved Garrote, Shiv to
Kingsbane, Thistle Tea to its energy gain), the Blindside event reorder,
the Kingsbane toggle. The Shiv cooldown reduction from Toxic Stiletto is
only a code comment; the spec models no cooldown reduction or reset.

## Candidates left

Ordered by expected value, which is low for all of them: the case study
found Envenom, Rupture, Garrote, Fan of Knives, Deathmark and Kingsbane
similar for the reference and the weaker player, and the app's floor
(GCD gaps, Kingsbane window, Vanish) already reproduces the visible
gap between them.

1. **Rupture and Garrote clip and uptime** (merging the three DoT rows):
   value the bleed time overwritten past the pandemic carry-over, and the
   bleed time missing from first application, from the player's own
   applications and ticks, less forced time. Separating a mistake from
   what top players do: compare against the top player's clip total per
   minute on the same boss; Garrote refreshes dropping a stealth
   snapshot are the one part that is real damage. Most likely to survive
   phase 3.
2. **Combo-point waste and low-point finishers** (merging the builder,
   combo point and finisher rows): value each wasted point as a share of
   a finisher's damage. The case study's Envenom count was similar
   (20 vs 25 bad), and WoWAnalyzer's fixed 5 ignores real exceptions, so
   expect it to fail the premise check.
3. **Envenom with Rupture nearly gone**: needs a Rupture timeline; value
   by the Rupture time lost. Overlaps item 1.
4. **Fan of Knives into few targets**: needs the target count at each
   cast; the case study measured 56% vs 51% one-target, so the top
   player does it as often.
5. **Mutilate in Subterfuge**: only if the talent still exists; cheap but
   small.
