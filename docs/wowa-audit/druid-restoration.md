# WoWAnalyzer audit: Restoration Druid

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Druid shared layer,
  then the spec), spot-checked at their source lines (3 of
  3 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares 12.1.0, fully maintained; last change 2026-09-07
  (12.1 rework 2026-08-27 to 2026-08-29). No priority list, no checklist and
  no suggestion list: every grade is a guide section, a per-cast
  Good / Ok / Bad / Perfect mark, or a cast-efficiency bar. A healer: the
  spellbook lists Wrath, Moonfire and Sunfire only as healer damage spells
  and nothing grades them. The guide has an "Advanced" toggle that hides
  the Perfect grade and the Lifebloom, Nature's Swiftness and Rejuvenation
  sections until switched on.
- **App:** `lib/damage/wow/specs/healer.ts` (`"Restoration Druid"` shares
  `HEALER_CHECKS`: one check, `healGcds`, which finds heal GCDs whose
  healing was mostly overheal and values each at the healer's damage
  filler), the generic checks (`checkGcdGaps`, `checkCooldownDrift`,
  deaths), `combatPotion` (`potion.ts`). **No Restoration Druid cooldown is
  in `tracked-cooldowns.ts`.** Case study: none for this spec; the header of
  healer.ts records only the healer survey (10 Restoration Druid sample
  players) and no WoWAnalyzer comparison, so nothing here is `verified`.
- **Phase 3:** not started.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Restoration sets or
  adds. The class layer (druid shared) adds one graded rule, Innervate
  efficiency, and the Control of the Dream cooldown model; both are rows
  below.

For a healer almost nothing here is damage. The user does not judge
healing, mitigation, mana or utility in this analysis, so those rows are
`no-damage`. Where one could inform `lib/mitigation/` it says so.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| druid-restoration/Guide/always-be-casting | superseded | `checkGcdGaps` | Master Shapeshifter, Abundance (advice text only) | idle GCDs | The core downtime panel (5 / 10 / 15% of the whole fight idle, forced time counted) plus text advising Wrath in real downtime for mana, but not while waiting on Abundance to drop. The app counts and values the idle itself, less forced time. The advice is mana, not damage. |
| druid-restoration/AlwaysBeCasting/healing-ability-list | no-damage | — | none | — | Configuration: which heals count as healing GCDs for the non-healing-time statistic. Flourish is listed although it is passive on Tranquility now. The app sorts GCDs by kind itself (`gcdKinds`). |
| druid-restoration/Abilities/swiftmend-efficiency | no-damage | — | Soul of the Forest, Verdant Infusion, Reforestation (switch the grade on); Early Spring, Prosperity, Renewing Surge, Dryad's Dance | Swiftmend held past ready | Target 80%, whole-fight, hard-coded 15s with the reductions modelled in code. A heal, and not tracked: its recharge is reduced by talents the log does not show. If it ever mattered for mitigation planning, `lib/mitigation/` is where it belongs. |
| druid-restoration/Abilities/tranquility-efficiency | no-damage | — | Tranquility | Tranquility used fewer times than a 180s cadence allows | Target 70% (lower than other majors because it answers raid damage). Hard-coded 180s, forced time counted as ready. Healing cooldown, assigned to raid damage; not judged here. Useful at most as a mitigation-plan check. |
| druid-restoration/Abilities/natures-swiftness-efficiency | no-damage | — | Nature's Swiftness; Passing Seasons (−15s per rank); Control of the Dream (class layer) | held | Target 80%, whole-fight, cooldown written from the talent rank. Utility for instant heals. |
| druid-restoration/Abilities/tree-of-life-efficiency | no-damage | — | Incarnation: Tree of Life; Cenarius Guidance (−5s per Grove Guardian); Control of the Dream | Tree not used on cooldown | Target 80%, hard-coded 180s, reductions modelled (the guardian-fade timing is approximate). A healing throughput cooldown; the app tracks none for this spec. |
| druid-restoration/Abilities/convoke-efficiency | no-damage | — | Convoke the Spirits; Cenarius Guidance (60s instead of 120s); Control of the Dream | Convoke held | Target 80%, whole-fight. Convoke does deal some damage, but its value on a healer is healing; the app has no way to price it as a damage GCD. Feral's Convoke is tracked at 61s in `tracked-cooldowns.ts` (that measures a Feral player, not this spec). |
| druid-restoration/Abilities/innervate-efficiency | no-damage | — | Innervate | Innervate not cast on cooldown | Target 80%, hard-coded 180s, whole-fight; restated from the class layer. A self mana cooldown after the 12.1 change. Mana, not damage. |
| druid-restoration/Guide/cooldown-graph | no-damage | — | the four cooldowns' talents | long gaps between uses | A display of the four efficiency bars with full-cooldown gaps in red. No adjustment for the pull start or a fight that ends early. |
| druid-restoration/Lifebloom/cast-grade | no-damage | — | Everbloom, Verdancy, Overgrowth | moving Lifebloom, letting it drop, refreshing before the last 4.5s | Per-cast grade on a fixed 15s duration. Healing upkeep; hidden unless Advanced is on. |
| druid-restoration/Lifebloom/uptime-advice | no-damage | — | Everbloom, Verdancy, Lifetreading and others (text) | — | "Aim for 100%" is text; the uptime bar is display only. |
| druid-restoration/Efflorescence/uptime-display | no-damage | — | Efflorescence; Lifetreading | — | Active and target-weighted uptime, whole-fight, no grade. |
| druid-restoration/Swiftmend/implant-targeting | no-damage | — | Implant | Swiftmend on a healthy non-Lifebloom target | Triage at or under 30% health. Healing targeting. |
| druid-restoration/Swiftmend/consume-priority | no-damage | — | Implant and Verdant Infusion (absence) | Swiftmend eating a full-length Rejuvenation | Which HoT was consumed is a guess when the log link is missing. Healing efficiency. |
| druid-restoration/Swiftmend/sotf-spend | no-damage | — | Soul of the Forest | proc expiring or overwritten | The unspent proc is a heal, and a pre-pull proc is not credited. |
| druid-restoration/Regrowth/cast-grade | no-damage | — | Abundance, Nature's Bounty, Rampant Growth, Overgrowth | full-price Regrowth with no cheap window and no one under 30% | A mana-price grade (cast at full price is "bad"); health under 30% counts as triage but may be unknown. |
| druid-restoration/Regrowth/abundance-cast-rate | no-damage | — | Abundance | Regrowth spam while Abundance is down | Share of casts under Abundance: perfect 70%, good 50%, ok 30%. Cast-count based, so short pulls skew it. |
| druid-restoration/Regrowth/mastery-stacks | no-damage | — | Nature's Bounty | Regrowth onto targets with no HoTs | Average HoT stacks on the target, rebuilt from a hand-kept HoT model. |
| druid-restoration/Regrowth/overheal-stats | covered | `healGcds` | Nature's Bounty (cleave) | casting into full-health targets | Direct and average overheal at or under 30% is perfect, up to 70% ok. The app's `healGcds` already flags a Regrowth cast whose healing (tick window up to 30s) was under 20% effective and values it at the healer's damage filler, marked inference. The two overheal measures differ, so the numbers will not match. |
| druid-restoration/WildGrowth/target-count | no-damage | — | Improved Wild Growth, Incarnation: Tree of Life | Wild Growth hitting fewer than the 5 (+2, +2) expected | Hits versus a fixed expected count; Grove Guardian copies not considered. A healing efficiency grade. |
| druid-restoration/WildGrowth/pre-cooldown | no-damage | — | Tranquility, Convoke | Wild Growth not out when a major cooldown starts | Retags the most recent Wild Growth only; changes perfect versus good. |
| druid-restoration/WildGrowth/full-target-rate | no-damage | — | as target-count | repeated short-target casts | Share of casts hitting every available target (perfect 90%). |
| druid-restoration/WildGrowth/early-overheal | covered | `healGcds` | none | casting into a healthy raid | Overheal in the first 3s after each cast; the text itself says overheal alone does not fail a cast. `healGcds` counts a Wild Growth whose whole-cast healing was under 20% effective, over a longer window, and prices it as a lost damage filler. |
| druid-restoration/WildGrowth/leftover-mana | no-damage | — | none | finishing a kill with a large mana pool | Boss kills only: ending mana ÷ average Wild Growth cost, perfect at 0. Assumes more casts would have been useful and off cooldown (Wild Growth is on a 10s recharge). Mana, not damage. |
| druid-restoration/Rejuvenation/clip-grade | no-damage | — | Photosynthesis, Germination, Soul of the Forest, Abundance | refreshing Rejuvenation with much time left | A pandemic grade on a healing HoT. Advanced only. |
| druid-restoration/Rejuvenation/abundance-uptime | no-damage | — | Abundance | letting Rejuvenation fall below 5 | Whole-fight Abundance uptime, perfect 95%; forced downtime counted as lost. |
| druid-restoration/Rejuvenation/avg-active-rejuvs | no-damage | — | Abundance, Germination | sparse Rejuvenation coverage | Time-weighted raid-wide count against a hard-coded 5. |
| druid-restoration/Rejuvenation/clipped-share | no-damage | — | none | habitual early refreshes | Share of casts clipped, perfect at 2%; time lost per minute is computed but not graded. |
| druid-restoration/NaturesSwiftness/consume-grade | no-damage | — | Nature's Swiftness, Overgrowth | spent on a root or Cyclone, or left to expire | Regrowth good, Rebirth ok, anything else bad. Hand-kept consumer list. |
| druid-restoration/NaturesSwiftness/cooldown-sync | no-damage | — | season 2 tier set, Convoke or Tranquility | pressed away from the big cooldown | Upgrades a good cast to perfect. Depends on gear detection. |
| druid-restoration/TreeOfLife/rejuvenation-ramp | wrong | `checkGcdGaps` | Incarnation: Tree of Life | not spamming Rejuvenation in the first 15s | Grades active casting time inside a window (good at 55%, ok at 40%): the same idle `checkGcdGaps` already counts, graded a second time. The window is also cut short by the fight end. |
| druid-restoration/TreeOfLife/overall-active-time | wrong | `checkGcdGaps` | Incarnation: Tree of Life | idle or moving during Tree | Active time over a hard-coded 30s (good at 90%, ok at 70%): a window grade that double-counts the idle the gap check counts. It ignores the extension from Potent Enchantments and Tranquility's pause, counts forced movement as idle, and clips at the fight end. |
| druid-restoration/TreeOfLife/healing-share-thresholds | no-damage | — | Incarnation: Tree of Life | never | Dead code: thresholds on Tree's share of total healing that nothing reads. |
| druid-restoration/Tranquility/ramp-checks | no-damage | — | Tranquility | cast on an empty HoT board | At least one Wild Growth and five Regrowths out; the Rejuvenation count is a display line. Raid-wide HoT counts, no assignment awareness. |
| druid-restoration/Tranquility/full-channel | no-damage | — | Tranquility | channel cut before all 7 ticks | Hard-coded tick count. A cut channel is a cast lost to movement or a boss mechanic, a healing loss. |
| druid-restoration/Innervate/self-cast | no-damage | — | Innervate | cast on another player | Bad if the target is not the caster; wrong in a raid that gives it to another healer by plan. |
| druid-restoration/Innervate/no-mana-cap | no-damage | — | Innervate | Innervate with high mana | Good only if mana never reaches max within the 8s buff and 5s after. Mana. |
| druid-restoration/Convoke/rejuvenation-ramp | no-damage | — | Convoke the Spirits | cast on an empty HoT board | Bad unless at least one Rejuvenation was already out; a very low bar. |
| druid-restoration/Convoke/reforestation-sync | no-damage | — | Reforestation | Convoke without Tree up | Ok instead of good outside Tree form. |
| druid-restoration/Flourish/ramp-checks | no-damage | — | Flourish | — | The UI fragment is never rendered, so the grade never reaches a user. |
| druid-shared/Abilities/cooldown-declarations | no-damage | — | many | — | Fixed cooldowns for non-rotational abilities so the cooldown model can track them; no grade of its own. |
| druid-shared/utility | no-damage | — | — | — | Mighty Bash, Incapacitating Roar, Cyclone, Hibernate, Typhoon, Mass Entanglement, Entangling Roots, Ursol's Vortex, Soothe, Barkskin, Wild Charge, Stampeding Roar, Heart of the Wild, Remove Corruption, Rebirth, Dash and the forms. Utility and defensives are survival calls and are not judged. |
| druid-restoration/statistics | no-damage | — | — | — | Display only: uptimes box, average HoTs and the HoT-count graph, Mastery: Harmony attribution, hero tree healing totals, about 28 Keeper of the Grove and Wildstalker cards, spec talent cards, season 1 and 2 tier-set cards, the mana tab, the Convoke per-cast table, low-health healing. |

## Not rules

Models the rules above rest on, all hand-maintained: the normalizers
(Clearcasting, Soul of the Forest link, Tree of Life, Swiftmend, Wild
Growth pre-cast order, and the HoT cast-link normalizer); the HoT tracker
and attributor, with durations and extensions kept by hand; the Mastery
model; the event links from Swiftmend to the HoT it consumed and from a
Soul of the Forest proc to its spender; ActiveDruidForm; Control of the
Dream's rewrite of Convoke, Tree of Life and Nature's Swiftness cooldowns
(it also assumes the ability was up 15s before the pull); mana cost and
mana trackers; the guide's Advanced toggle.

The cooldown reductions the spec writes into code are not rules but they
decide every efficiency number above: Early Spring (Swiftmend and Wild
Growth), Passing Seasons (Nature's Swiftness), Improved Ironbark, Cenarius
Guidance (Convoke and Tree, the latter approximate), Renewing Surge
(Swiftmend recharged by a share of its full length per cast, more on a low
target; target health unknown gets the base), Dryad's Dance, Prosperity
(two Swiftmend charges). The log shows none of them (dps-analysis.md), and
the Season 1 four-piece reduction is a statistic only, not written into
the model.

## Candidates left

None worth building. This is a healer, and everything with a damage
consequence is already the app's `healGcds` (a heal GCD that healed
almost nothing, priced as a lost damage filler) or the generic idle check.
Listed in case a damage case study on a Restoration Druid says otherwise:

- **Convoke / Tree of Life drift** (`checkCooldownDrift` via
  `spentCooldownDrift`-style reductions): the cooldowns are real, and their
  talent reductions are known (Cenarius Guidance, Control of the Dream), but
  their value is healing and cannot be priced as a damage GCD. Low expected
  value; the only thing it would add is a mitigation-plan view. Not a
  candidate until a Restoration Druid's survey shows a spread worth
  modelling.
