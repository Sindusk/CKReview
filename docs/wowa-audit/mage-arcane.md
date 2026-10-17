# WoWAnalyzer audit: Arcane Mage

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Mage shared layer,
  then the spec), spot-checked at their source lines (4 of
  4 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares 12.1, fully maintained; last change 2026-09-11 (the
  Prismatic Bolt rework ran 2026-08-22 to 2026-09-10). No priority list and
  no checklist: every grade is a guide section or a cast-efficiency bar.
  Grades are qualitative (Perfect / Good / Ok / Fail), never damage-valued.
  The Mage shared layer grades nothing; it supplies the spellbook, reset
  models and display statistics.
- **App:** `lib/damage/wow/specs/ranged.ts` (`"Arcane Mage"`: Arcane Surge
  window through `burstGcdFindings`), `tracked-cooldowns.ts` (Touch of the
  Magi 45s, Arcane Surge 91s), `potion.ts`, generic checks. Case study:
  qpZx3mWaG7gcDdYB pull 3 (Neximage) against 3Vz6Qt2RyTPXwpJn (Màzz,
  100th percentile), page saved; the header of ranged.ts records what
  matched.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Arcane sets or
  adds.
- **Phase 3:** not started.
- **Hero trees:** the grades branch on Sunfury (Memory of Alar) and
  Spellslinger (Splinterstorm). A character with neither falls to Fail in
  every ladder.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| mage-arcane/Guide/active-time | superseded | `checkGcdGaps` | none | idle time | Core bands (5 / 10 / 15% of the whole fight idle), Stasis and intermissions in the denominator. Case study 82.1% vs 96.2%; the app shows the same as small delays (9.5s vs 1.9s) and gaps. |
| mage-arcane/Guide/cancelled-casts | covered | `checkInterrupts` | none | a cast cut by movement or a mechanic | Above 2 / 5 / 15% of cast-time casts; the class module leaves out Fire Blast, Combustion and Shimmer. Counts boss-forced cancels. |
| mage-arcane/Cooldowns/cast-efficiency-bars | covered | `checkCooldownDrift` (Touch of the Magi, Arcane Surge) | per ability | a cooldown held past ready | The umbrella for the five bars below. Whole-fight denominator, forced time counted as ready. |
| mage-arcane/CastEfficiency/arcane-surge | verified | `checkCooldownDrift` (Arcane Surge, 91s) + `burstGcdFindings` | Arcane Surge | Surge held | 90% target, declared 90s. Case study: 100% on both players. Tracked at 91.0s shortest, 94.4s median, so no reduction to model. |
| mage-arcane/CastEfficiency/touch-of-the-magi | covered | `checkCooldownDrift` (Touch of the Magi, 45s) | Touch of the Magi | Touch held | 90% target, declared 45s. **Overstates:** the case study's 84% (0:49-1:34) was ready inside Stasis, then held to line up with Arcane Surge at 1:34; Màzz spent his into Stasis's 99% reduction. No lost use, which is why the app's forced-time handling is the check to trust. |
| mage-arcane/CastEfficiency/arcane-orb | candidate | — | Arcane Orb; Charged Orb (extra charge, higher target); Spellfrost Teachings | Orb held past its recharge | Not tracked: it has charges and its cooldown is cut by Arcane Splinter hits (a quarter-second per splinter hit), so the observed interval spreads (25.4s median across 118 casts; the shortest, 0.9s, is a second charge). The reduction is damage-event driven, not a buff event, so `spentCooldownDrift` (`reduceOn` per buff event) may not fit; check before building. Value: the Orb's own damage per cast; the case study had Orbs averaging 294k against a 241k average GCD, so a missed Orb is worth roughly a GCD. Low value; the top player may also hold Orb for Surge. |
| mage-arcane/CastEfficiency/evocation | no-damage | — | Evocation | — | 90% target, declared 45s. A mana restore; the app doesn't judge mana (shared.ts leaves it out). No Evocation row among the 19-player survey's casts down to the Healthstone. |
| mage-arcane/CastEfficiency/presence-of-mind | no-damage | — | Presence of Mind | — | 60% target, suggestion off. Not among the survey's casts, so nobody surveyed took it. |
| mage-arcane/ArcaneSurge/active-time-in-window | wrong | `burstGcdFindings` + `checkGcdGaps` | Arcane Surge | casting gaps in the roughly 15s Surge window | Perfect at 95% active, Good 90%, Ok 80%, else Fail. Grades active time inside the window, the same idle the gap check counts (and the app already values at the window's bonus, less forced time). Forced downtime inside the window counts against the player. |
| mage-arcane/TouchOfTheMagi/active-time-per-cast | wrong | `checkGcdGaps` | Touch of the Magi | casting gaps in the roughly 12s debuff window | Same bands as Surge, graded per cast. Double-counts the idle; no forced-downtime exemption. |
| mage-arcane/TouchOfTheMagi/average-active-time | wrong | `checkGcdGaps` | Touch of the Magi | the same, averaged | Overview tile for the average of the per-cast shares. A cast whose debuff isn't linked counts as zero. |
| mage-arcane/TouchOfTheMagi/surge-ready-soon | wrong | — | Touch of the Magi, Arcane Surge | Touch cast with Surge under 40s from ready | Fails a Touch with less than 40s of Surge cooldown left. Looks like an ordering defect in the source (a ready Surge reads zero remaining, so the Touch in front of a Surge fails while one just after it passes), and the case study shows the better player lining Touch up with Surge, not away from it. The first Touch of a fight is judged against a ready Surge and would fail. |
| mage-arcane/PresenceOfMind/charges-over-two | candidate | — | Presence of Mind | Presence of Mind cast with 3 or 4 charges | Fail above 2 charges. Log-visible from the spec's own charge tracker. No surveyed player took Presence of Mind (the 19-player survey has no cast), so it can't be measured; build only when a log with it appears. Low value. |
| mage-arcane/PresenceOfMind/orb-available | candidate | — | Presence of Mind, Arcane Orb | Presence of Mind cast while Orb was ready | Needs the modelled Orb cooldown; see the Orb row. Same note: nobody surveyed took Presence of Mind. |
| mage-arcane/PresenceOfMind/clearcasting-up | candidate | — | Presence of Mind | Presence of Mind cast with Clearcasting up | Buff is log-visible. Source doesn't order same-timestamp events for this check. Nobody surveyed took Presence of Mind. |
| mage-arcane/PresenceOfMind/orb-soon | candidate | — | Presence of Mind, Arcane Orb | Presence of Mind cast within 5s of Orb returning | Fixed 5s; a build without Orb probably fails every cast (inferred, not tested). Nobody surveyed took Presence of Mind. |
| mage-arcane/PresenceOfMind/stacks-used | candidate | — | Presence of Mind | the two instant Blasts not both spent | A real, small loss (an instant Blast not cast). Nobody surveyed took Presence of Mind. |
| mage-arcane/PresenceOfMind/good-branch-unreachable | wrong | — | Presence of Mind | — | The one non-Fail branch needs a condition an earlier check already rejects, so every cast fails. A source bug; the individual conditions are the rules, not the grade. |
| mage-arcane/ArcaneBarrage/out-of-mana-ok | no-damage | — | none | Barrage at 10% mana or lower | Ok regardless of other conditions. The app doesn't judge mana. |
| mage-arcane/ArcaneBarrage/spellslinger-perfect | candidate | — | Splinterstorm; Arcane Salvo; Orb Barrage | Barrage at 4 charges and full Salvo stacks | Perfect for 4 charges with 20 Salvo stacks, 19 with Orb Barrage, or Touch ready with 15 or more. Log-visible (buff stacks, charges from resources). Value from the log: damage of a Barrage cast at the target stack count against the same player's Barrages cast earlier, times how many were cast early. Likely a large share of the spec's burst and the thresholds are hard-coded, so the premise needs a top-player comparison first; the stack count a top player Barrages at is the open question. |
| mage-arcane/ArcaneBarrage/sunfury-perfect | candidate | — | Memory of Alar; Arcane Salvo | Barrage at 4 charges, 12+ stacks | Needs Clearcasting, or 5+ targets with Orb or Pulse ready. The target branches are cleave-only (a single-target boss never reaches them), so only the Clearcasting branch is portable. Same valuation as the Spellslinger row. |
| mage-arcane/ArcaneBarrage/good-tier | candidate | — | Splinterstorm or Memory of Alar; Arcane Salvo | Barrage at 20 stacks (Spellslinger), at 25 and 4 charges (Sunfury), or with Arcane Soul | Pass tiers of the same ladder as the two rows above; the loss is only in the Ok and Fail branches. |
| mage-arcane/ArcaneBarrage/ok-tier | candidate | — | as above; Orb Barrage | an early Barrage (low Salvo stacks) | The part of the ladder that is a damage claim: Barrages below the stack lines. One gap in the source: Spellslinger at 15-19 stacks with Orb Barrage matches no Ok rule and falls to Fail. This is the row to value if the Barrage ladder is built. |
| mage-arcane/ArcaneBarrage/fail-tier | wrong | — | Memory of Alar | Sunfury Barrage into fewer than 5 targets | Target count is what was hit, not what was in range, and a single-target boss can never reach 5. Fight-blind. The catch-all Fail also catches a character with no hero marker. |
| mage-arcane/ArcaneBarrage/text-vs-code | no-damage | — | Memory of Alar, Splinterstorm | — | The explanation lists "8 stacks and Touch ready" and "out of mana" as valid; the code has no Touch-ready rule for Sunfury and out of mana is only Ok. A documentation mismatch. |
| mage-arcane/ArcaneMissiles/clipped-in-gcd | candidate | — | Arcane Missiles | a channel ended more than 200ms before its GCD would have | Fail for clipping inside the GCD. Log-visible. Whether ticks are lost depends on what was cast next and why; the case study's matched finding is only that Missiles ended 0.31s vs 0.10s late (delay, not clip). Low value. |
| mage-arcane/ArcaneMissiles/spellslinger-perfect-clip | superseded | — | Splinterstorm, Amplification, Overpowered Missiles | — | Perfect for clipping a channel with Salvo under 15 and no Overpowered Missiles proc: a pass tier. Tick counts come from a damage link; base ticks hard-coded at five. |
| mage-arcane/ArcaneMissiles/good-tier | superseded | — | Splinterstorm or Memory of Alar; Arcane Salvo | — | Good at Salvo under 15 (Spellslinger) or 12 (Sunfury): the pass state of the Missiles-versus-Barrage choice, covered by the Barrage ok-tier row. |
| mage-arcane/ArcaneMissiles/ok-tier | candidate | — | as above; Improved Clearcasting | Missiles at high Salvo when Barrage was preferred | The same decision from the other side as the Barrage ladder; build them together or not at all. The capped-Clearcasting branch is unreachable for any character with a hero marker (a leftover from the 2026-04 removal of expiry and overcap checks). |
| mage-arcane/ArcaneMissiles/channel-end-delay | covered | `checkGcdGaps` | Arcane Missiles | the gap after a channel | Under 100ms Perfect, 300ms Good, 500ms Ok, else Fail; also an average tile. Case study: 0.31s vs 0.10s late on average, which the app counts within the 9.5s vs 1.9s small delays. The next-cast search can pair across forced pauses. |
| mage-arcane/ArcaneOrb/no-targets | candidate | — | Arcane Orb | an Orb that hit nothing | Orb cast with no linked damage. Log-visible and cheap to count; valued as one Orb's average damage. Probably rare; a boss going untargetable reads as zero hits, so it needs the forced windows. |
| mage-arcane/ArcaneOrb/sunfury-full-charges | wrong | — | Memory of Alar | Orb cast at 4 charges (Sunfury) | The charge waste isn't in the log's own damage. The case study's 8 bad of 11 (cast at 4 charges) did average 294k per Orb against a 241k GCD, so the Orbs paid for themselves; the source also changed this rule on 2026-08-22. Not adopted in ranged.ts. |
| mage-arcane/ArcaneOrb/spellslinger-full-single | wrong | — | Splinterstorm | Orb at 4 charges into one target | Cleave-minded: a single-target boss never gets 2 targets. Same Orb damage note. |
| mage-arcane/ArcaneOrb/good-tier | superseded | — | Splinterstorm or Memory of Alar | — | The pass state; no Perfect tier exists. A character with no hero marker falls to Fail. |
| mage-arcane/PrismaticBolt/munched | candidate | — | Prismatic Bolt (apex); Arcane Soul | a proc overwritten before use | Fail unless Arcane Soul was up. Log-visible (buff refresh without a cast). `checkProcs` counts expiries; whether it counts a refresh without a cast was not read. Case study: 3 munched vs the top player's 6, so the premise is weak and may fail phase 3. |
| mage-arcane/PrismaticBolt/expired | covered | `checkProcs` (expiries) | Prismatic Bolt | a proc that fell off unused | Whether `checkProcs` picks it up on an Arcane pull: phase 3. The source counts forced downtime the same. |
| mage-arcane/PrismaticBolt/delay-over-20s | candidate | — | Prismatic Bolt | a proc cast 20s or more after it appeared | A hard 20s line; delay includes forced time. Little loss unless the proc expires, which the expiry row counts. Low value. |
| mage-arcane/PrismaticBolt/sunfury-cumulative-power | candidate | — | Memory of Alar; tier-set 4-piece | casting below 8 Cumulative Power stacks | Perfect at 8 or more stacks of a gear-set buff, Ok below. A gear fact, not a talent; without the 4-piece every cast is Good. Needs the set check; low value. |
| mage-arcane/PrismaticBolt/spellslinger-conditions | candidate | — | Splinterstorm; Arcane Salvo; tier-set 4-piece | casting below 13 Salvo stacks, or into one target | Good with 13 or more stacks and a spare condition; a 2-target cast always passes, so the single-target Ok is cleave-minded. Only the Salvo-stack part is portable; value it with the Barrage ladder. |
| mage-arcane/statistics | no-damage | — | Arcane Echo and others | — | Display only: Arcane Echo and Touch damage per cast, Orb hits per cast, per-cast Barrage, Missiles and Prismatic Bolt tiles, the Mana Management heatmap (no grade), cooldown throughput (damage during Surge and Touch with a 4s lead buffer), active time graph, mana chart, Arcane Intellect uptime, barrier absorbed, Ice Block and Ice Cold mitigation, the Preparation section. |
| mage-shared/utility | no-damage | — | none | — | Arcane Intellect, Frost Nova, Ring of Frost, Blink or Shimmer, Counterspell, Remove Curse, Slow Fall, Spellsteal, Alter Time, the Invisibilities, Mirror Image, the Polymorphs, Time Warp; defensives Prismatic Barrier, Ice Block / Ice Cold. Utility and defensives aren't judged; the class modules grade none of them. |

Not rules (models the rules above rest on): the Arcane Charge tracker
(max 4; Barrage spends all, refilling at once with Arcane Soul), the
event-order normalizers (charge gain after its cast, Surge buff after its
cast, Clearcasting before a same-timestamp Barrage or Prismatic Bolt), the
cast-link normalizer (a default 75ms window, 2.6s for Missiles ticks; table
not extracted), the hero-tree markers, the class constants (Salvo max 20,
Missiles base ticks 5, charge max 4, Touch duration 12s), the spellbook
GCDs, the Buffs timeline list, and the Mage reset models (Barrier
Diffusion, Quick Witted, Master of Time) which touch no damage cooldown.
Glorious Incandescence, which would cut Orb's cooldown, isn't enabled for
Arcane. Dead code inside enabled modules: the Orb target getter, Missiles'
`castsWithoutNextCast`, the commented-out Prismatic Barrier aura, an unused
guide constant and Touch's `hasSiphonStorm` flag.

## Candidates left

Ordered by expected value; most fail phase 3.

1. **Barrage ladder (Salvo stacks at the cast)**: the only damage claim in
   the spec with real weight, since Barrage is the burst spender. Measure
   Barrage damage against its Salvo count per player on top Arcane parses
   first; if the best players also fire at low stacks (as the Orb check did
   with its charges), drop the whole ladder, including the Missiles
   ok-tier and the Prismatic Bolt Salvo condition.
2. **Arcane Orb efficiency** through the Spellfrost Teachings reduction:
   worth about one GCD a use; needs the damage-driven reduction, which
   `spentCooldownDrift` may not take.
3. **Prismatic Bolt munched and expired**: the case study's top player
   munched more, so likely wrong.
4. **Orb no-targets**: cheap, probably rare.
5. **Missiles clipped in GCD**: low value.
6. **Presence of Mind conditions**: nobody in the survey took the talent.

Not yet measured. The sample cast table in `spell-data.ts` and the
ranged.ts case study are the only measurements behind the notes above.
