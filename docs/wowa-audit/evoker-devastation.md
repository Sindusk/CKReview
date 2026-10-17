# WoWAnalyzer audit: Devastation Evoker

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Evoker shared layer,
  then the spec), spot-checked at their source lines (4 of
  4 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares 12.1.0, fully maintained; last change 2026-10-12
  (small Disintegrate fixes; Disintegrate and its proc visuals were
  rewritten 2026-09-13 and graded more finely 2026-09-24). **No priority
  list is live:** the three priority-list files exist but are switched off
  in the parser and the guide only prints a notice, so the spec has no
  rotation-order grade at all. No checklist either; every grade is a guide
  section or a suggestion threshold.
- **App:** `lib/damage/wow/specs/ranged.ts` (`"Devastation Evoker"`:
  Dragonrage window, Strafing Run expiry), `tracked-cooldowns.ts`
  (Dragonrage, Tip the Scales), `potion.ts`, generic checks. Essence is
  not a judged resource (logged on spenders only). Case study:
  qpZx3mWaG7gcDdYB pull 3 (Bragontix, Scalecommander) against WoWAnalyzer's
  page; the header of ranged.ts records what matched. No second page or
  reference player was recorded for this spec.
- **Phase 3:** not started.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Devastation sets or
  adds. The Evoker shared layer (Fire Breath target, proc-buff verdicts,
  Imminent Destruction, Leaping Flames, Mass Disintegrate) is included here
  because Devastation is the spec that uses it.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| evoker-devastation/Abilities/dragonrage-efficiency | verified | `checkCooldownDrift` (Dragonrage, 120s) | Dragonrage | Dragonrage held | 95% target (major below 90%), whole fight, fixed 120s. Case study: 3 casts, WoWAnalyzer 87% counted a 2:03 to 2:46 hold that ran into Stasis (2:29 to 2:48); three full windows beat four with two cut, so no lost use. It counts forced time as ready and expects an end-of-fight use. |
| evoker-devastation/Abilities/tip-the-scales | no-damage | `checkCooldownDrift` (Tip the Scales, 120s) | Tip the Scales | — | WoWAnalyzer gives it no target (bar only); the app tracks it as a plain recast. Nothing to reconcile. |
| evoker-devastation/Abilities/eternity-surge-efficiency | candidate | — | Eternity Surge; Event Horizon; Causality; Font of Magic | an empower held past ready | 95% target, whole fight. Not tracked: the recharge is cut by Causality (about half a second per Disintegrate tick, a smaller amount per Pyre hit), Azure Sweep with the season 1 tier set, and Event Horizon (3s, static). Case study: "sat ready" 82%, left open because the rule was not pinned from one player. **How it would be built:** `spentCooldownDrift` takes a fixed reduction per buff event, which does not fit a reduction per damage tick; it would need a tick-event variant, and the Pyre share is a guess in WoWAnalyzer itself. A use is worth the empower's damage less the displaced filler GCDs, read from the player's own hits. **Separating a mistake:** top players hold empowers for Dragonrage and Stasis, so only holds outside forced windows and outside the pre-Dragonrage hold would count. Low expected value: one unpinned page and a model of its own. |
| evoker-devastation/Abilities/fire-breath-efficiency | candidate | — | Fire Breath; Ashes in Motion; Interwoven Threads; Legacy of the Lifebinder; Causality | an empower held past ready | 95% target, whole fight, graded for this spec only (the shared source's spec test matches only Devastation). Case study "sat ready" 86%, open. Same reduction model and the same obstacles as Eternity Surge, plus charge and talent-driven base recharge (30s, 5s shorter, 0.9 multiplier). Treat the two empowers as one build if either is built. |
| evoker-devastation/Abilities/other-cooldowns | no-damage | — | Deep Breath; Maneuverability; Onyx Legacy | — | Deep Breath, Tip the Scales and all utility are declared without a target. Deep Breath's second cast is the Strafing Run row. |
| evoker-devastation/CoreSection/essence-time-at-cap | unverifiable | — | Power Nexus (cap 5 to 6) | Essence full | Perfect at 10% or less of the fight at cap, Fail above 20%, whole fight. The log shows Essence only on the casts that spend it, so time sitting at the cap is not visible (the case study found WoWAnalyzer's waste at 12.7% "good" and did not adopt it). The app's `primaryResourceCapFindings` skips Evoker for the same reason. The intermission caveat in WoWAnalyzer's own text is never subtracted. |
| evoker-devastation/CoreSection/active-time | superseded | `checkGcdGaps` | none | idle time | Perfect at no downtime, Good to 5%, Ok to 10%, whole fight, Stasis counted as idle. The app values each gap less forced time. Fixed in the engine from the case study: Deep Breath's flight no longer reads as idle (`lockStatus`) and empowers are no longer read as cancelled. |
| evoker-devastation/CancelledCasts/cancel-rate | verified | `checkInterrupts` | none | a cast cut by movement | Suggestion above 5 / 7.5 / 10% of casts; the guide's colour bands (1% perfect, 7.5% good) disagree with it. Case study: 4 cancelled Living Flames matched. Counts boss interrupts and forced movement too. |
| evoker-devastation/DragonRage/extensions-per-window | candidate | — | Dragonrage; Animosity | a Dragonrage window with few empowers | Perfect at 6 or more finished empowers in the window, Good at 4, else Fail (Ok if the kill cut the window). The cutoffs ignore window length and Animosity ranks. The app's `window` check already values the missing GCDs inside Dragonrage (`burstGcdFindings`), which would also catch idle but not a window spent on fillers instead of empowers. **How it would be built:** per window, compare empowers released against the window's length and the empowers' own readiness (they come off cooldown too), value a missing empower as its damage over a filler GCD. **Separating a mistake:** the window length is itself set by the empowers (each extends it), so top players with a late empower set the benchmark; compare with the best players' counts per window length rather than the fixed 4 and 6. Moderate value, since this is the spec's main burst; measure it. |
| evoker-devastation/DragonRage/per-empower-count | wrong | `burstGcdFindings` (Dragonrage) | Dragonrage | fewer than 2 of an empower in a window | Perfect at 3, Good at 2, per empower, in a window. A second grading of the same window as the extensions row, with counts a 27 to 30s cooldown cannot meet in a short window. Fire Breath and Eternity Surge are held to the same count whatever their readiness. |
| evoker-devastation/Disintegrate/tick-efficiency-outside-dragonrage | candidate | `checkGcdGaps` (covers idle only) | hero tree (Scalecommander, Flameshaper); Mass Disintegrate; Azure Celerity | ticks dropped by a clipped or cancelled Disintegrate | Ticks dealt over ticks the casts could have dealt: Flameshaper Perfect 95%, Scalecommander 100%. Case study: Disintegrate tick efficiency 340 of 385 (88%), left open. **How it would be valued:** ticks lost times that player's own average tick, from the log's damage events; haste-independent tick counts mean each cast has a fixed ceiling of 4, 5 chained, one more with Azure Celerity. **Separating a mistake:** WoWAnalyzer itself says early chaining is occasionally useful and clipping for an empower or Deep Breath is acceptable as Flameshaper, so only losses to other spells, to nothing (a plain cancel) and to a chain two or more ticks early would count; movement cancels need the forced and movement windows. Medium value, the largest unmeasured loss on this page. |
| evoker-devastation/Disintegrate/tick-efficiency-dragonrage | superseded | — | Dragonrage; hero tree | — | The same ratio computed for casts started while Dragonrage is up; the split is only by buff state at the cast start. Subsumed by the row above if built. |
| evoker-devastation/Disintegrate/mass-disintegrate-ticks | wrong | — | Mass Disintegrate (Scalecommander); Concentrated Power | a Mass Disintegrate losing ticks on one target | Compares ticks on all targets with targets times ticks. The target count comes from the cast link, and any average above one target excuses lost ticks, so it neither scores cleave nor tells a dying add from a mistake. |
| evoker-devastation/Disintegrate/per-cast-chain | superseded | — | hero tree | a recast with 2 or more ticks left, or onto another target | A per-cast view of the same tick loss, with a target swap graded Bad even when a mechanic forced it. Part of the tick-efficiency candidate. |
| evoker-devastation/Disintegrate/per-cast-clip | superseded | — | hero tree (clip allowed as Flameshaper) | a clip by anything but Fire Breath, Eternity Surge or Deep Breath | A per-cast view of the same tick loss, with a hard-coded list of good clippers. Part of the tick-efficiency candidate; the page itself calls clipping a minor gain. |
| evoker-devastation/Disintegrate/per-cast-cancel | wrong | `checkInterrupts` | none | a channel stopped with ticks left | Any lost tick is Fail, forced movement, stuns, deaths and a dying target included. The cancelled-cast check already counts the movement cost with forced windows removed. |
| evoker-devastation/Disintegrate/window-rating | superseded | — | Dragonrage | — | The floored average of the tick figures per window, with windows of very different lengths. Subsumed by the tick-efficiency candidate. |
| evoker-devastation/EssenceBurst/expired-wasted | candidate | `checkProcs` (expiries; whether it sees this buff: phase 3) | Essence Burst; Essence Attunement | a stack falling off unspent | Binary Good or Fail per stack; overcap is not graded. Case study: not adopted, 3 expiries across the pull, each worth well under a GCD. **How it would be valued:** the Disintegrate or Pyre it would have made free, from the player's own average. **Separating a mistake:** an expiry in a no-target phase is forced; WoWAnalyzer counts it anyway. Low value; the class's procs all expire rarely. |
| evoker-devastation/Burnout/decayed | candidate | `checkProcs` (expiries; whether it sees this buff: phase 3) | Burnout | a charge decaying unused | Case study: 3 expiries outside the death, each well under a GCD. Same value and caveats as Essence Burst. |
| evoker-devastation/UnboundFlame/stacks-and-essence-burst | candidate | — | Rising Fury; Essence Burst | four charges after Dragonrage left to decay, or a cast with Essence Burst already up | Binary. The charges are a post-Dragonrage filler with an Essence Burst chance; refreshing a held Essence Burst is the only overcap. Not adopted in the case study as part of the proc expiries. Low value. |
| evoker-devastation/AzureSweep/expired-overcap-refresh | candidate | — | Azure Sweep; season 1 tier set | an Eternity Surge cast with two Azure Sweeps held, or letting them expire | Binary, including overcap and refresh (this module turns both on, correcting the shared ledger). Not looked at in the case study. Low value; a free instant spender. |
| evoker-devastation/StrafingRun/buff-expired | verified | `strafingRun` (ranged.ts) | Strafing Run; Maneuverability; Mass Disintegrate | the second Deep Breath not made within 18s | Case study: 6 of 7 used on both sides; the one from 1:57 ran out at 2:15. The app values the lost Deep Breath with its Melt Armor damage less the flight's lock. WoWAnalyzer's advice that Scalecommanders should wait as long as possible is prose, not graded. |
| evoker-devastation/DamageEfficiency/imminent-destruction | candidate | — | Imminent Destruction | stacks left unspent when the buff falls off | Each stack that goes unspent is Fail; the displayed utilization (Perfect 100%, Good 95%, Ok 80%) divides by a different figure than the rating. Case study: 1 expiry, not adopted. Low value. |
| evoker-devastation/DamageEfficiency/leaping-flames | candidate | — | Leaping Flames | a Fire Breath charge left to decay | Binary, lenient inside Dragonrage. Case study: 1 expiry, not adopted. Low value; the grade ignores cleave. |
| evoker-devastation/DamageEfficiency/mass-disintegrate-buff | candidate | — | Mass Disintegrate (Scalecommander) | a stack expiring or overcapped | Binary. Case study: 1 expiry, not adopted. Low value; target count is not scored. |
| evoker-shared/ProcBuffAnalyzer/fight-end-leftover | wrong | — | per proc | stacks held at fight end | An Ok entry for any proc still held when the fight ends, though the section says such procs are excluded. A kill or wipe is not told apart from a played-out kill. |
| evoker-shared/Abilities/disintegrate-no-target | no-damage | — | none | — | Filler spells (Disintegrate, Living Flame, Azure Strike) carry no cast-efficiency target. Listed so nothing is invented for them. |
| evoker-devastation/utility | no-damage | — | Obsidian Scales; Zephyr; Hover; Time Spiral; Rescue; Source of Magic and others | — | Defensives, mobility and utility have fixed cooldowns and no efficiency target; the Defensives guide section is prose and a timeline. Utility and defensives are not judged. |
| evoker-devastation/statistics | no-damage | — | — | — | Display only: Arcane Intensity, Catalyze, Causality (reduction by source, effective against wasted), Consume Flame, Engulfing Blaze, Eye of Infinity, Heat Wave, Honed Aggression, Iridescence, Lay Waste, Rising Fury, Scintillation, Scorching Embers, Shattering Stars, Spellweaver's Dominance, Star Salvo, Strafing Run damage, Titanic Wrath, Volatility, Pyre damage split, the season 1 and 2 tier-set statistics, the hero-tree statistic modules, the empower rank chart, the Dragonrage damage summary and the timeline highlights. |

## Not rules

Models the rules above rest on: the Disintegrate tracker and its
Dragonrage windows (Mythic Plus pull windows exclude trash), the Essence
resource tracker (cap 5, 6 with Power Nexus), the empower cooldown model in
which an unreleased empower does not start its recharge, the Causality,
season tier-set, Event Horizon and Wingleader cooldown reductions, the
Strafing Run cooldown handling, the cast-link, Essence Burst and
Disintegrate-chain normalizers (their time buffers are hand-tuned), the
invalid-event remover, and the buff timeline. The three priority-list files
are dead code.

## Candidates left

Ordered by expected value. None is measured; most fail phase 3.

1. **Disintegrate tick efficiency** (one row, with its chain, clip, cancel
   and window views folded in). The one open number from the case study
   (88%), and the largest loss that no app check sees. Risk: WoWAnalyzer's
   own text allows clipping and early chains, so only losses that top
   players avoid would stand.
2. **Dragonrage empower count per window.** The main burst, but the window
   length depends on the empowers themselves, and the window check already
   counts idle. Value only if players differ in empowers released against
   readiness.
3. **Fire Breath and Eternity Surge efficiency.** Needs a model of a
   reduction per damage tick (Causality), which the shared drift helper does
   not take; the case study already found the numbers unpinned from one
   player.
4. **Proc expiries** (Essence Burst, Burnout, Leaping Flames, Mass
   Disintegrate, Imminent Destruction, Unbound Flame, Azure Sweep). Each is
   binary and the case study put each well under a GCD. Check first whether
   `checkProcs` already covers any of them on a Devastation log; most likely
   not worth a rule.
