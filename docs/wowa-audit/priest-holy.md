# WoWAnalyzer audit: Holy Priest

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Priest shared layer,
  then the spec), spot-checked at their source lines (3 of
  3 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares patch 12.0.1 (lagging; the clone is at 12.1.0), marked
  partially maintained. The 2026-03-19 changelog entry says modules and
  some talents still need implementing; the latest change is 2026-04-11
  (Defensives guide section). There is no priority list and no checklist:
  the graded output is a "Core Spells" and a "Healing Cooldowns" guide
  section plus the shared Defensives and Preparation sections. A Holy Words
  section exists only as a TODO. Most of the ~73 modules are display-only
  talent statistics. Talent-specific numbers (Waste No Time, Holy
  Celerity, Seraphic Crescendo, the Holy Word reduction table) are doubtful
  for 12.1.0; they are noted below, not turned into candidates.
- **App:** `lib/damage/wow/specs/healer.ts` (`"Holy Priest"` runs
  `HEALER_CHECKS`, one check, `healGcds`: a heal GCD whose spell was under
  20% effective, valued at the healer's own damage filler, marked
  inference), the generic checks (`checkGcdGaps`, `checkDeaths`,
  `checkInterrupts`). Holy Priest has no entry in `tracked-cooldowns.ts`
  and no spec-specific burst window or resource check; healers are skipped
  by the potion check (`potion.ts`). Case study: none for Holy Priest;
  healer.ts was built from a survey of 12 Holy Priest sample players and
  the first look at one Ula'tek kill, not matched against a WoWAnalyzer
  page. So nothing below is `verified`.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Holy Priest sets or
  adds. Class-layer rules (Defensives, Twins of the Sun Priestess,
  Translucent Image, Protective Light, Benevolence) come from the Priest
  shared extract and are folded into the utility rows.
- **Phase 3:** not started.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| priest-holy/PrayerOfMending/cast-efficiency | no-damage | — | Guiding Light, Waste No Time, Epiphany | Prayer of Mending left uncast | Declared 80 / 60 / 40% over the whole fight. A heal GCD: the cost of skipping it is healing, not damage. Not tracked in `tracked-cooldowns.ts` for any healer. The model also ignores the free Epiphany recasts, which raises its ceiling, and counts forced time as ready. Waste No Time and Guiding Light are unverified for 12.0.1. |
| priest-holy/Halo/cast-efficiency | no-damage | — | Halo; off when the Archon talent Power Surge is taken | Halo cast under about 0.8 times per 60s | Same 80 / 60 / 40% and 60s model. Halo does deal damage, but for a healer it is a heal button and the app does not judge when to heal. Shadow Priest tracks Halo in `tracked-cooldowns.ts` (60s); that is the damage spec's list, not Holy's. Whole-fight denominator, forced time counted as ready, pre-pull cast missed. |
| priest-holy/DivineHymn/cooldown-bar | no-damage | — | Seraphic Crescendo (120s instead of 180s) | Divine Hymn used less than about 30% of possible times | The bar is so low it fires only on a plain skip. Healing cooldown; the timing against raid damage is not judged. Hard-coded durations, whole-fight denominator. |
| priest-holy/Apotheosis/cooldown-bar | no-damage | — | Apotheosis | Apotheosis unused for most of the fight | Same shape, 30 / 10 / 0%, 120s. Healing and Holy Word throughput. A drift check would be possible on its own recast, but its value is healing. |
| priest-holy/PrayerOfHealing/cast-quality | no-damage | — | Lightweaver, Surge of Light, Spiritwell, Divinity | a Prayer of Healing cast with none of the free or discounted buffs up | Graded per cast by which buffs were up. The loss is mana and cast time, and it fires even on one injured target (no target count). Spiritwell and Divinity were added April 2026, so the grading is fresh; the rest is unverified. |
| priest-holy/Lightweaver/flash-heal-stacks | no-damage | — | Lightweaver, Surge of Light | Flash Heal cast at four Lightweaver stacks | A wasted stack is lost mana and cast-time efficiency. Cap of four is hard-coded; casts with no linked heal event are skipped. |
| priest-holy/Epiphany/proc-usage | no-damage | — | Epiphany | Epiphany buff expiring unspent | A free Prayer of Mending. The guide never calls the module, so the bar is dead output (the statistic still renders). The app has no proc check on healers; `checkProcs` is not a heal check. |
| priest-holy/HolyWordCDR/cooldown-model | unverifiable | — | Holy Celerity, Prophet's Insight, Miracle Worker, Light of the Naaru, Voice of Harmony, Apotheosis | — | The cooldown reductions behind the Holy Word ready time are in code, not the log. The Apotheosis 3x cooldown rate and the 4x reduction multiplier look like a double count; unverified. Holy Word efficiency is configured but never displayed (the Holy Words section is a TODO). Nothing to compare for damage. |
| priest-holy/AlwaysBeCasting/active-time | superseded | `checkGcdGaps` | none | idle time | Core thresholds over the whole fight. Healer GCDs are mostly heals, so idle time is the app's gap value, and the `healGcds` check separately prices wasted heal GCDs. |
| priest-holy/FortitudeRaidBuff/uptime | no-damage | — | none | own Power Word: Fortitude missing | Below 95 / 90 / 0%; no guide consumer, so it may grade nothing. Preparation, not play. |
| priest-holy/HolyNova/targets | no-damage | — | Holy Nova | Holy Nova cast with few allies in range | Friendly-target count; no guide consumer. Returns a pass with no casts. |
| priest-holy/SpiritOfRedemption/time | unverifiable | — | Spirit of Redemption | dying with the buff up | Unit and direction of the comparison look inconsistent (milliseconds against second-sized numbers) and nothing consumes it. Not worth reading. |
| priest-holy/Guide/defensives | no-damage | — | Desperate Prayer, Fade; Translucent Image, Protective Light | — | Utility, defensives and mitigation: Desperate Prayer value and died-with-ready, Fade, Protective Light, Power Word: Shield, Twins of the Sun Priestess self-cast of Power Infusion (the app does not judge Power Infusion recasts either). The user does not judge these. Desperate Prayer's use rating and the Protective Light window values are the nearest to `lib/mitigation/` material, if a defensives view ever wants a rating of what a use absorbed. |
| priest-shared/ShadowWordPain/uptime | covered | `dotUptimeFindings` | none | the DoT absent from every enemy for over 10% of the fight | Shadow and Discipline only, not loaded by Holy. Listed because the class layer is shared; Holy Priests are not expected to keep DoTs up (healer.ts says so). |
| priest-holy/statistics | no-damage | — | many | — | Display only: Echo of Light attribution, Holy Word reduction by source, Divine Hymn and Guardian Spirit totals, healing efficiency and mana charts, healing received, and talent boxes (Oracle and Archon trees, Prayerful Litany, Prismatic Echoes, Divine Image, Cosmic Ripple and others). |

Not rules (models the rules above rest on): the `SpellUsable` cooldown and
charge override, the Holy Word reduction tracker, the spellbook, mana
costs, the cast-link normalizer (casts to heals, Epiphany recasts, Surge of
Light flashes), the Echo of Light and Hymn amplification models, the mana
tracker. Dead code: AngelicFeather and BodyAndSoul (not registered), the
stat-weight files, an empty Ultimate Serenity file.

## Candidates left

None. Holy Priest has no damage rotation in the extract, so no rule is a
candidate. Honest expected value of building anything from this spec is
low: every graded item is healing, mana or a cooldown whose use depends on
raid damage the log does not tell the app to judge.

If a phase 3 is ever wanted, the only ideas worth a look, in order:

1. **Holy Word and Halo cooldown drift** (`checkCooldownDrift` extended to
   healers). Value a lost use at the healer's damage filler per GCD it
   replaced, as `healGcds` does. It would need the reduction model
   (Smite and Holy Nova feed Chastise; Flash Heal and Prayer of Healing feed
   Serenity and Sanctify), which the log does not show, and fits the spread
   rule in `tracked-cooldowns.ts` (recast intervals spread too far for a
   fixed cooldown), so it would go through `spentCooldownDrift` with a
   per-use reduction. The talent numbers are doubtful on 12.0.1. A mistake
   would have to be separated from healers deliberately holding for raid
   damage; likely fails the premise check.
2. **Damage filler between heals.** Whether top Holy Priests press Smite
   and Holy Fire more than the study player. This is a gap measure that
   `checkGcdGaps` and `healGcds` already approximate; measure top players
   first.
