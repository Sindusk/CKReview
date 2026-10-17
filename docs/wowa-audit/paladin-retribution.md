# WoWAnalyzer audit: Retribution Paladin

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Paladin shared layer,
  then the spec), spot-checked at their source lines (4 of
  4 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares patch 12.0.7 while the clone is on retail 12.1.0, so
  the spec **lags** one minor patch. Maintained, partial; last change
  2026-04-28 ("Timeline updates"). No priority list and no checklist: the
  guide has a Core and a Cooldowns section, and three threshold getters
  (Art of War, Shield of Vengeance, the spec's downtime) are not read by
  any code in the spec, so they may never render. Rules for talents that
  have changed since 12.0.7 (Radiant Glory, Light's Guidance, Holy Flames,
  Divine Toll, the Crusade haste numbers) are noted as doubtful, not made
  candidates.
- **App:** `lib/damage/wow/specs/melee.ts` (`"Retribution Paladin"`: the
  Avenging Wrath window through `burstGcdFindings`, the main-resource cap,
  and `holyPowerWaste`, which rebuilds Holy Power waste from the spender
  snapshots), `tracked-cooldowns.ts` (Wake of Ashes, Avenging Wrath,
  Execution Sentence), `potion.ts`, generic checks. Case study:
  qpZx3mWaG7gcDdYB pull 3 (Polpo) against ACmXHMFtaPLR9k8w fight 15
  (Yenvenger, 99th percentile), both pages saved; the header of melee.ts
  records what matched.
- **Phase 3:** not started.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Retribution sets or
  adds. The Paladin shared layer (the Holy Power waste suggestion, Judgment
  consumption, Hammer of Wrath's configuration) is not repeated here;
  Retribution's own grade of Holy Power waste is the first row.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| paladin-retribution/Guide/holy-power-waste-grade | verified | `holyPowerWaste` (melee.ts, `spenderSnapshotWaste`) | none (hint text mentions Crusading Strikes, Divine Toll, Divine Resonance) | builders cast at 5 Holy Power, free Judgments over-filling the bar | Wasted ÷ (generated + wasted): perfect at 10% or less, good 15%, ok 20%, else fail; looser than the shared layer's own 2 / 5 / 8% suggestion, so the two disagree. Case study: 41.9% vs 12.9% on the page; the app's rebuild gave 33% vs 6% after forced time, 5.62M vs 1.14M. The log carries Holy Power on spenders only, so the app fits gain per builder; ~80% of WoWAnalyzer's figure for both players. The Divine Toll / Divine Resonance hint text is doubtful after talent changes. |
| paladin-retribution/CrusaderStrike/cast-at-cap | superseded | `holyPowerWaste` | none | Crusader Strike at 5 Holy Power | A timeline flag on the press that over-filled; attached to the next press when the cast event comes first, so it can name the wrong press. The app prices the same waste per interval between spenders, not per press. |
| paladin-retribution/BladeOfJustice/cast-at-cap | superseded | `holyPowerWaste` | Blade of Justice | Blade of Justice at 4 or 5 | The same, with wording that Blade gives more than one Holy Power (doubtful if that changed). |
| paladin-retribution/Expurgation/debuff-uptime | candidate | — | Holy Flames (Expurgation comes from Blade of Justice) | Expurgation left off the boss | Perfect at 99% or more, good 95%, ok 80%, whole fight, pooled over enemies. Log-visible as a debuff on the enemy and `dotUptimeFindings` takes status ids, so it would be wired the same way as a DoT. Case study: 88% vs 92%, recorded as small. Value by the lost seconds × the Expurgation share of the player's damage, read from the log. Whole-fight denominator and pre-pull handling are WoWAnalyzer's errors; the app measures from the first application, less forced time. Doubtful whether Holy Flames still works this way. Low expected value. |
| paladin-retribution/WakeOfAshes/hammer-of-light-in-window | candidate | — | Light's Guidance (Templar) | Wake of Ashes with no Hammer of Light within 8s | One or more Hammer of Light casts after each Wake. The 8s is hard-coded and a Wake near the kill fails unfairly. Value by the damage of the Hammer of Light that was not cast. A Hammer of Light is empowered by Wake, so a miss is a lost cast, not a moved one; what would separate a mistake from top play is whether top players ever skip it for movement or the kill. Doubtful after talent changes. |
| paladin-retribution/WakeOfAshes/execution-sentence-on-target | candidate | — | Execution Sentence | Wake of Ashes before Execution Sentence | Binary: any enemy carrying the debuff. Tests any enemy, not the Wake's target, so cleave can pass falsely, and an Execution Sentence cast just before can fail. Value from the log by comparing Wake damage with the debuff against without; top players may press Wake on cooldown regardless, which would fail the premise. Guide text assumes Radiant Glory makes Wake the main cooldown (doubtful). Low expected value. |
| paladin-retribution/ArtOfWar/procs-consumed | covered | `checkProcs` (expiries) | Art of War | a proc refreshed or left unused for 10s | Consumed share under 95 / 90 / 85%, not rendered. **Likely bug:** the window opens only when Blade of Justice was on cooldown at the proc, so a proc arriving with Blade ready never counts as consumed and the share is understated. The app counts expiries from the buff stream rather than a share. Whether it reports the Art of War buff on Retribution pulls: phase 3. |
| paladin-retribution/ShieldOfVengeance/absorb-used | no-damage | — | Shield of Vengeance | — | A defensive. **Likely bug:** the cast listener is on Divine Protection, not Shield of Vengeance, so the denominator follows the wrong spell. |
| paladin-retribution/AlwaysBeCasting/downtime | superseded | `checkGcdGaps` | none | idle time | Above 15 / 25 / 35% idle, looser than core's, whole fight, Stasis counted; no spec code reads the getter, so the guide shows the core grade. The app values each gap less forced time. |
| paladin-retribution/MeleeUptime/swing-gap | candidate | — | Crusading Strikes (the swing proxy) | out of melee range | Core's rule (core.md), tracked on the Crusading Strikes spell, which may be absent without the talent. Doubts as in core: can't tell an untargetable boss from a player out of range, and most out-of-range time is mechanics. The case study recorded ability uptime 80.1% vs 91.3%; the app's gap check prices idle GCDs but not range. Build only for out-of-range time with no forced window. |
| paladin-retribution/Abilities/wake-of-ashes-efficiency | verified | `checkCooldownDrift` (Wake of Ashes, 30s) | none | Wake held | 85% target, whole fight; hold only for adds within 15s. Case study: 89%, the holds were in Stasis, no lost use (WoWAnalyzer counts forced time as ready). |
| paladin-retribution/Abilities/avenging-wrath-efficiency | verified | `checkCooldownDrift` (Avenging Wrath, 60s) + `burstGcdFindings` | enabled only without Radiant Glory | Avenging Wrath held | 90% target, major. Case study 100%. Crusade has no entry of its own, and the extra Avenging Wrath from Instrument of Retribution is not credited by WoWAnalyzer. |
| paladin-retribution/Abilities/execution-sentence-efficiency | verified | `checkCooldownDrift` (Execution Sentence, 60s) | Execution Sentence | held | 90% target. Case study 100%. |
| paladin-retribution/Abilities/divine-toll-efficiency | candidate | — | Quickened Invocation (60s → 30s) | Divine Toll held | 90% target. Not tracked: intervals spread too far (shortest 30s, median 62s, tracked-cooldowns.ts), which is the Quickened Invocation choice and the Holy Power-side resets, not one fixed recast. Would be a per-player recast by talent, valued by the Divine Toll's Judgments and the Holy Power it grants; whether the talent is readable from the log is unchecked. Case study: ~27s of holds outside Stasis, at most one cast lost just before the kill. Low expected value. |
| paladin-retribution/Abilities/crusader-strike-efficiency | superseded | `holyPowerWaste`, `checkGcdGaps` | Swift Justice (−2s a rank); disabled with Crusading Strikes / Templar Strikes | — | Two charges, haste-scaled, default target. How often the builder is pressed is set by Holy Power and the GCD, so waste at the cap and idle time carry it. |
| paladin-retribution/Abilities/judgment-efficiency | superseded | `holyPowerWaste`, `checkGcdGaps` | Swift Justice; Improved Judgment (extra charge) | — | The extra Judgments from Divine Toll and Divine Resonance aren't modelled, so it can read wrong both ways. Judgment consumption itself is in the shared layer. |
| paladin-retribution/Abilities/blade-of-justice-efficiency | superseded | `holyPowerWaste`, `checkGcdGaps` | Light of Justice; Improved Blade of Justice (extra charge); Art of War (reset) | — | 75% target, the lowered figure fitting the partly modelled Art of War resets. Resets are not in the log, so a recharge fit would misfire; the cap check carries it. |
| paladin-retribution/Abilities/lay-on-hands-efficiency | no-damage | — | Unbreakable Spirit | — | A defensive, 10% target. |
| paladin-retribution/statistics | no-damage | — | — | — | Display only: the builder-use donut (builders that gave no effective Holy Power count as wasted), the Art of War proc luck chart, Empyrean Power counts and Divine Storm damage, Execution Sentence damage, Instrument of Retribution Avenging Wrath seconds, Holy Power per minute, Divine Purpose, Lightbearer, the buff timeline highlights, Avenging Wrath damage summaries. |
| paladin-shared/utility | no-damage | — | — | — | Lay on Hands, Word of Glory, Divine Shield, Divine Protection, Blessings, auras, Blinding Light, Hammer of Justice, Rebuke, Cleanse Toxins, Turn Evil. Utility and defensives aren't judged. |

Not rules (models the rules above rest on): the Wake of Ashes normalizer
(an event link from a Wake to Hammer of Light casts within 8s), the
Crusade haste model (assumed haste per finisher with hard-coded numbers
that are doubtful for later patches; active only with Crusade), the Holy
Power tracker, the builder and finisher lists, the Art of War and Final
Verdict cooldown resets written into spec code. Dead code: an unimported
Hammer of Wrath module (a cast-at-max flag), unused by the parser.

## Candidates left

By expected value, all low and none measured:

- **Divine Toll drift**: the largest cooldown the app leaves untracked, but
  the case study found only ~27s of holds and at most one lost cast.
- **Hammer of Light after Wake of Ashes**: a clean lost cast if it fails,
  but it rests on a Templar talent that may have changed; top players may
  skip it only for movement.
- **Expurgation uptime**: wire as a debuff uptime; the case study gap was
  88% vs 92%.
- **Melee range**: only the out-of-range time with no forced window.
- **Execution Sentence before Wake**: likely the same for top players.

Phase 3 should first check that the top Retribution players on the same
fights do not do these as often.
