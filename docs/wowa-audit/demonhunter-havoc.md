# WoWAnalyzer audit: Havoc Demon Hunter

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Demon Hunter shared layer,
  then the spec), spot-checked at their source lines (3 of
  3 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares 12.1.0, maintained in part (its own overview says
  "mostly updated for 12.1.0"); last change 2026-05-24 (Eternal Hunt
  analysis), with Inertia work in April and May. The class layer was last
  touched 2025-12-08. Most `suggestionThresholds` getters in this spec have
  no reader, so they never become a grade or message (the number appears
  only as a statistic); only the guide sections and the core cast-efficiency
  module produce advice. Several per-use grades (Inertia, Unbound Chaos,
  The Hunt) are computed but never drawn in the guide. Havoc's own
  loosened idle limits (15 / 25 / 35%) are dead: the guide reads the core
  5 / 10 / 15% numbers.
- **App:** `lib/damage/wow/specs/melee.ts` (`"Havoc Demon Hunter"`:
  Metamorphosis window through `burstGcdFindings`, the main resource
  through `primaryResourceCapFindings`, and the `eternalHunt` check),
  `tracked-cooldowns.ts` (Essence Break, The Hunt, Metamorphosis),
  `potion.ts`, generic checks. Case study: qpZx3mWaG7gcDdYB pull 3
  (Mythnarra) against 3Vz6Qt2RyTPXwpJn (Hawkerton, 100th percentile), both
  pages saved; the header of melee.ts records what matched: Eternal Hunt
  2 good of 6, potions 2/2; Metamorphosis 79% overstated (a hold ran into
  Stasis); Eye Beam 99%, The Hunt 100%, Essence Break 93%; Fury at the cap
  and small delays a floor that both players share.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Havoc sets or
  adds. The Demon Hunter class layer (Immolation Aura and Sigil of Flame
  hit grades are Vengeance only; Felblade's 95% target and Fury-waste
  getter) is folded into the rows that touch Havoc.
- **Phase 3:** not started.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| demonhunter-havoc/Guide/active-time-grade | superseded | `checkGcdGaps` | none | idle time | Coloured by the core limits (0 perfect, then 5 / 10%), whole-fight denominator, Stasis counted as idle (its own text admits it). The app values each gap less forced time. |
| demonhunter-havoc/AlwaysBeCasting/downtime-override-unused | superseded | `checkGcdGaps` | none | never | A looser 15 / 25 / 35% idle set, but the guide never reads it. Nothing to port; porting it would make the app laxer than WoWAnalyzer really is. |
| demonhunter-havoc/FuryTracker/time-at-cap | covered | `primaryResourceCapFindings` | Blind Fury, Unrestrained Fury | Fury sitting at the cap | Share of the whole fight at the cap: up to 15% perfect, 20 good, 25 ok. Forced time with high Fury reads as capped. Case study: the app finds 2.24M of Fury cap for Mythnarra, mostly Reaver's Glaive, and WoWAnalyzer rates both players' Fury waste good (13.7% / 17.5%), so it's a floor, not his mistake. |
| demonhunter-havoc/FuryDetails/wasted-fury-share | superseded | `primaryResourceCapFindings` | none | — | Wasted ÷ (wasted + generated), 15 / 20 / 25%, getter only (no reader). The generated side includes a guessed Blind Fury gain. |
| demonhunter-havoc/DemonBlades/fury-waste, BurningHatred/fury-waste, DemonicAppetite/fury-waste | superseded | `primaryResourceCapFindings` | Demon Blades; Burning Hatred; Demonic Appetite | — | Each is that source's wasted Fury ÷ gained, 3 / 7 / 10%, getter only. The cap check counts the same waste across sources and values it. |
| demonhunter-havoc/BlindFury/eye-beam-over-50-fury | unverifiable | — | Blind Fury | Eye Beam cast at 50+ Fury | Blind Fury's refill is not in the log; the tracker invents the gain, and the module's own guide text says so. The app cannot tell how much of the refill was lost. The cut-off is also hard-coded and compared inconsistently across two files. |
| demonhunter-havoc/BladeDance/low-target-cast | wrong | — | none of Trail of Ruin / First Blood | Blade Dance or Death Sweep hitting 2-4 targets | Marks a cast bad on 2-4 hits but not on 1, which is backwards for a boss with one stray add. The check is a target count, not damage. Fight-blind. |
| demonhunter-havoc/DemonicDeathSweep/two-sweeps-per-eye-beam | wrong | — | Demonic | fewer than two Death Sweeps after an Eye Beam that starts Metamorphosis | The window is judged one Eye Beam late, the first Eye Beam is judged against a zero count, and the last is never judged, so it miscounts by construction. Hard-coded 5s. |
| demonhunter-havoc/EyeBeam/furious-gaze-trigger | candidate | — | Furious Gaze | an Eye Beam cut before it grants the haste buff | Binary per cast. A movement-cancelled or boss-phase-ended Eye Beam reads as a fail. Value: the damage of the missing channel time, read from that player's own full Eye Beams, less forced time. Low-medium: top players cancel for mechanics too. |
| demonhunter-havoc/EyeBeam/inertia-fit | candidate | — | Inertia | Eye Beam started without Inertia, or running past its end | Good if the channel ends inside the buff, ok if only the start is inside, fail if cast outside. Value: the player's Eye Beam damage inside Inertia vs outside, as the `eternalHunt` check does for the empowered beam. Premise check needed: Eye Beam is on a 40s cooldown and Inertia comes about every 20-25s, so not every window can hold one. |
| demonhunter-havoc/EssenceBreak/cast-grade | candidate | — | Essence Break | Essence Break cast while Eye Beam is about to be ready and Metamorphosis is down, or followed by few spenders | Windows of 4s (6s with the four-piece tier set), Eye Beam "available" at 4s or less left. Value: the buffed spenders actually cast after it, against the player's own best. Its Eye Beam readiness comes from a hand-built cooldown model that treats forced time as ready, and the unbuffed-cast clause is not implemented. Medium-low. |
| demonhunter-havoc/EssenceBreak/no-targets | candidate | — | Essence Break | an Essence Break that hit nothing | Marked "cooldown wasted". Rare, and a Stasis cast reads as a fail. Value: the lost cast as one Essence Break's damage. Very low. |
| demonhunter-havoc/EternalHunt/consume-with-channel | verified | `eternalHunt` (melee.ts) | Eternal Hunt, Demonic Intensity | the empowered Eye Beam not used after The Hunt | Case study: 2 good of 6 for Mythnarra, who pressed Eye Beam just before four of his six Hunts, against Hawkerton's every-Hunt. The app values the miss by the player's own empowered vs ordinary Eye Beam. WoWAnalyzer's perfect grade for an Abyssal Gaze under Demonic Intensity is a finer split the app doesn't make. |
| demonhunter-havoc/Inertia/setup-speed | candidate | — | Inertia | a slow start to the 5s buff | First non-trigger cast within 1.8s is perfect; hard-coded numbers, not drawn in the guide. Value: GCDs idle at the window's start, as `burstGcdFindings` does for Metamorphosis. Low: the gap check already counts that idle. |
| demonhunter-havoc/Inertia/eye-beam-in-window | wrong | — | Inertia | a window with no Eye Beam | Demands an Eye Beam in every window although Eye Beam is a 40s cooldown against a 20-25s cycle, so it cannot be perfect more than about every second window. Not drawn. The useful part is inertia-fit above. |
| demonhunter-havoc/Inertia/death-sweep-payload, annihilation-spender | wrong | — | Inertia | a window with fewer than two Death Sweeps or no Annihilation | Both spells exist only in Metamorphosis, so a window outside it is a forced fail, and the four window checks combine by taking the worst. Not drawn. |
| demonhunter-havoc/Inertia/uptime-threshold | no-damage | — | Inertia | — | Buff uptime graded "less than" 10 / 18 / 22%, but the limits are in inverted order and there is no reader. A statistic. |
| demonhunter-havoc/UnboundChaos/consume-with-fel-rush | candidate | — | Unbound Chaos | the buff gained from Immolation Aura not spent on a Fel Rush | Binary, not drawn. Fel Rush is also a movement spell, so spending it for the buff can cost a GCD or position, and the user doesn't judge movement. Value: the buff's damage from the log, if a Fel Rush hit is attributable. Low. |
| demonhunter-havoc/TheHunt/initiative-setup | candidate | — | Initiative, The Hunt | The Hunt cast without a Vengeful Retreat before it | Perfect with the crit buff up, good with a retreat in the last 4s. Not drawn. Value: the crit-buffed share of The Hunt's damage. Low: The Hunt is held for adds and Eternal Hunt timing, which the app already handles. |
| demonhunter-havoc/Exergy/uptime-threshold, Initiative/uptime-threshold, TacticalRetreat/uptime-threshold | no-damage | — | Exergy; Initiative; Tactical Retreat | — | Buff uptimes over the whole fight, getters with no reader. Exergy's limits (below 55 / 45 / 40%) even contradict its own "near 100%" text. Statistics. |
| demonhunter-havoc/Abilities/essence-break-efficiency | covered | `checkCooldownDrift` (Essence Break, 30s) | Essence Break | held past ready | 95% target with a declared 40s cooldown, against the 30s the app measured from logs (shortest interval 30.0s, median 35.5s). Case study 93% vs the app finding one use (88k). WoWAnalyzer counts Stasis as ready. |
| demonhunter-havoc/Abilities/the-hunt-efficiency | covered | `checkCooldownDrift` (The Hunt, 60s) | The Hunt | held past ready | 80% target, declared 90s against the 60s measured. Case study 100%. |
| demonhunter-havoc/Abilities/metamorphosis-efficiency | covered | `checkCooldownDrift` (Metamorphosis, 119s) | Metamorphosis | held past ready | 80% target. Case study 79%, overstated: the 2:08 to 2:53 hold ran into Stasis, and 5:23 instead of 4:53 left no fourth use before the kill. The app's drift needs a whole lost use outside forced time. |
| demonhunter-havoc/Abilities/eye-beam-efficiency | candidate | — | Cycle of Hatred | Eye Beam held past ready | 95% target on a flat 40s. Not tracked: the tracked-cooldowns.ts header leaves resource-gated cooldowns out, and Cycle of Hatred makes the recharge depend on the player's own spenders. The reduction is per cast (0.5s at rank one, 1s at rank two from each Chaos Strike, Annihilation, Blade Dance, Death Sweep or Glaive Tempest, only while Eye Beam is on cooldown), whereas `spentCooldownDrift`'s `reduceOn` takes a fixed reduction per buff event, so this needs a cast-based reduction first. Value: the Eye Beam damage of a lost use (about 2x when it is the Eternal Hunt one), valued with `valuePerUse`. WoWAnalyzer's own number needs the same modelled reduction and counts forced time as ready. Medium: Eye Beam is the biggest button, but the case study showed 99%. |
| demonhunter-havoc/Abilities/blade-dance-efficiency | candidate | — | First Blood, Trail of Ruin | Blade Dance or Death Sweep held | 95% on a 15s cooldown, 9s in Metamorphosis, both shortened by haste. Not tracked (cooldown flips with the buff and haste). Low: it is a cleave spell most of the time and the GCD check already counts idle. |
| demonhunter-havoc/Abilities/immolation-aura-efficiency | candidate | — | A Fire Inside | Immolation Aura held | 95% on a 30s cooldown shortened by haste, two charges with A Fire Inside. Not tracked. Low: it fills Fury and feeds Unbound Chaos, but its damage is small. |
| demonhunter-havoc/Abilities/throw-glaive-and-fel-rush | no-damage | — | Soulscar; Blazing Path | — | Throw Glaive 95% only with Soulscar (donut of time at 0 / 1 / 2 charges, not drawn); Fel Rush no target. Filler and movement; not judged. |
| demonhunter-havoc/Abilities/vengeful-retreat | no-damage | — | Tactical Retreat, Exergy | — | 95% only with Tactical Retreat. A movement button; the user doesn't judge movement. Its value as an Inertia or Initiative setup is covered by those rows. |
| demonhunter-havoc/Blur/defensive-usage | no-damage | — | Demonic Resilience | — | Damage-taken spikes with Blur coverage and a cooldown timeline. Defensive; not judged. |
| demonhunter-shared/ImmolationAura-and-SigilOfFlame/initial-hit | no-damage | — | none | — | Wired for Vengeance only; Havoc is never graded by them. |
| demonhunter-shared/Felblade/efficiency-and-fury-waste | covered | `primaryResourceCapFindings` | Felblade | Felblade cast near the Fury cap | 95% efficiency target (15s, haste, fixed 0.5s GCD; resets from Demon Bite are unmodelled in WoWAnalyzer, so it reads low) and a 3 / 7 / 10% waste getter with no reader. The cap check covers the waste. Efficiency not judged by the app. |
| demonhunter-shared/Demonsurge | candidate | — | Fel-scarred hero tree, Demonic | a Demonsurge proc wasted when Metamorphosis ends | Counts procs spent and wasted per trigger spell; nothing grades it. A real lost-damage condition. Value: each wasted proc's damage from the player's own spent ones. Whether the log's damage events let the app tell a proc from an ordinary cast is the open question. Low-medium. |
| demonhunter-havoc/statistics | no-damage | — | — | — | Display only: Metamorphosis uptime, cooldown throughput, Fury graph and breakdown, Cycle of Hatred seconds removed, Essence Break and The Hunt damage, Glaive Tempest, Inner Demon, Ragefire, Soulscar, Sigil of Spite, Trail of Ruin and Growing Inferno damage, Eternal Hunt counts, Unbound Chaos wasted procs. |
| demonhunter-shared/utility | no-damage | — | — | — | Glide, Disrupt, Torment, Spectral Sight, Chaos Nova, Consume Magic, Sigil of Misery, Darkness, Charred Warblades and Shattered Restoration healing. Utility and defensives aren't judged. |

Not rules (models the rules above rest on): the Fury tracker's invisible
Blind Fury gain and 50-Fury cut-off, event links (Eye Beam and
Metamorphosis ordering, Essence Break buffed casts, The Hunt charges and
damage, Furious Gaze, Unbound Chaos, Eternal Hunt, the duplicate Consuming
Fire remover), the Cycle of Hatred reduction model, the buffs definition,
guide text fragments and the rank-scaling constants (table, not
extracted). The app's own Metamorphosis window and Fury cap checks have no
single WoWAnalyzer rule behind them.

## Candidates left

By expected value, all unmeasured and most expected to fail phase 3:

1. **eye-beam-efficiency**: needs a cast-based reduction in
   `spentCooldownDrift` first. Medium value, since Eye Beam carries the
   Eternal Hunt payoff; the case study found 99%, so a miss may be rare.
2. **inertia-fit**: Eye Beam damage inside vs outside Inertia, valued as
   `eternalHunt` is. Premise risk: top players may not line it up every
   window.
3. **Demonsurge**: wasted procs, if the log can separate a proc.
4. **EssenceBreak/cast-grade**: buffed spenders after it, against the
   player's own best.
5. **EyeBeam/furious-gaze-trigger**: low-medium; cancels are often
   mechanics.
6. Low and probably not worth building: Inertia setup, Unbound Chaos,
   The Hunt with Initiative, Blade Dance and Immolation Aura efficiency,
   Essence Break with no targets.
