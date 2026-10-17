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
- **Phase 3:** done 2026-10-17 (Claude Opus 5.5). All Mythic, 58
  Retribution player-pulls: top Entombed Sentinels parses Tracer
  (GndQ9VFWtLzNjKpk, 100th), Blabang (aZ6NnwL8g9PdpGJ1, 99.0th),
  Yenvenger (ACmXHMFtaPLR9k8w, 99th), Yappin (MLy7nw8kaW1D394Y, 98.6th);
  top Vashnik parses fetched for this pass, Pipala (7pFPAqzc2NHLXjwZ
  fight 21, 100th) and Pçpaladin (1NL29tyvbzGhZgPK fight 18, 99.8th);
  weaker Vengadora (91.3th), Ifeepaladin (81.1th), eleven Vashnik kills
  under the 80th and five more Entombed Sentinels kills; the static's
  Polpo and Jgwentworth (16 pulls each, gVDPhzp61Zm29HMw, and the case
  study). Talents from casts, buffs and hits (CombatantInfo gives talent
  entry ids without names): everyone takes Crusading Strikes, Execution
  Sentence, Divine Toll with Divine Resonance, Wake of Ashes, Art of War,
  Divine Purpose, Divine Arbiter and Expurgation; 53 of 58 are Herald of
  the Sun, Yenvenger and Polpo's two Nek'zali pulls Templar; Jgwentworth
  plays Radiant Glory on four pulls. Built in
  `lib/damage/wow/specs/retribution.ts` (its header holds the models and
  numbers): values per use for the tracked cooldowns (Avenging Wrath and
  Execution Sentence were worth 0, so their drift never showed), Divine
  Toll tracked, all four `burstHold` (checks.ts, new: the fight's hold
  windows excuse the hold; Vashnik's top Pçpaladin presses them after
  each Imbibe, and Ula'tek's context got Heart windows), and **Divine
  Arbiter expired unused** (a proc missing from procs.ts, not a
  WoWAnalyzer row). Engine: Hammer of Light is a GCD press (game.ts).
  No `wrong` rows to re-check.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Retribution sets or
  adds. The Paladin shared layer (the Holy Power waste suggestion, Judgment
  consumption, Hammer of Wrath's configuration) is not repeated here;
  Retribution's own grade of Holy Power waste is the first row.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| paladin-retribution/Guide/holy-power-waste-grade | verified | `holyPowerWaste` (melee.ts, `spenderSnapshotWaste`) | none (hint text mentions Crusading Strikes, Divine Toll, Divine Resonance) | builders cast at 5 Holy Power, free Judgments over-filling the bar | Wasted ÷ (generated + wasted): perfect at 10% or less, good 15%, ok 20%, else fail; looser than the shared layer's own 2 / 5 / 8% suggestion, so the two disagree. Case study: 41.9% vs 12.9% on the page; the app's rebuild gave 33% vs 6% after forced time, 5.62M vs 1.14M. The log carries Holy Power on spenders only, so the app fits gain per builder; ~80% of WoWAnalyzer's figure for both players. The Divine Toll / Divine Resonance hint text is doubtful after talent changes. Phase 3 (2026-10-17), re-run on the top players: 3–13% of generation lost (Blabang 364k, Yenvenger 1.14M, Tracer 1.29M, Yappin 1.30M, Pçpaladin 1.37M, Pipala 3.29M) against 19–33% on the weaker (Zebroz 4.13M, Mushtard 3.98M, Polpo 5.62M on the case study). It fires on the top players about where WoWAnalyzer does (Yenvenger 12.9% there) and 2–5× more on the weaker: a real, common loss, kept. |
| paladin-retribution/CrusaderStrike/cast-at-cap | superseded | `holyPowerWaste` | none | Crusader Strike at 5 Holy Power | A timeline flag on the press that over-filled; attached to the next press when the cast event comes first, so it can name the wrong press. The app prices the same waste per interval between spenders, not per press. |
| paladin-retribution/BladeOfJustice/cast-at-cap | superseded | `holyPowerWaste` | Blade of Justice | Blade of Justice at 4 or 5 | The same, with wording that Blade gives more than one Holy Power (doubtful if that changed). |
| paladin-retribution/Expurgation/debuff-uptime | candidate | — | Holy Flames (Expurgation comes from Blade of Justice) | Expurgation left off the boss | Perfect at 99% or more, good 95%, ok 80%, whole fight, pooled over enemies. Log-visible as a debuff on the enemy and `dotUptimeFindings` takes status ids, so it would be wired the same way as a DoT. Case study: 88% vs 92%, recorded as small. Value by the lost seconds × the Expurgation share of the player's damage, read from the log. Whole-fight denominator and pre-pull handling are WoWAnalyzer's errors; the app measures from the first application, less forced time. Doubtful whether Holy Flames still works this way. Low expected value. Phase 3 (2026-10-17), **measured, not built** (negligible). Every player carries it (383346, applied by Blade of Justice). A trial `dotUptimeFindings` read 18–62k a pull on the top players (Tracer 57k, Yenvenger 62k, Pipala 50k, Pçpaladin 18k) and 0–186k on the weaker (Jgwentworth's Ula'tek Pull 1 459k, target swaps); the gaps follow target swaps, and a missed Blade of Justice is already a gap or Holy Power finding. |
| paladin-retribution/WakeOfAshes/hammer-of-light-in-window | candidate | — | Light's Guidance (Templar) | Wake of Ashes with no Hammer of Light within 8s | One or more Hammer of Light casts after each Wake. The 8s is hard-coded and a Wake near the kill fails unfairly. Value by the damage of the Hammer of Light that was not cast. A Hammer of Light is empowered by Wake, so a miss is a lost cast, not a moved one; what would separate a mistake from top play is whether top players ever skip it for movement or the kill. Doubtful after talent changes. Phase 3 (2026-10-17), **measured, not built** (never fires). Only three player-pulls are Templar (Yenvenger ACmXHMFtaPLR9k8w; Polpo at Nek'zali Pulls 1 and 2); the other 55 are Herald of the Sun and have no Hammer of Light, so the rule is skipped there. All three pressed Hammer of Light 0.9–3.5s after every Wake (33 of 33), and on every Light's Deliverance. Hammer of Light had read as idle (not in the spell survey); it's a GCD press now (game.ts). |
| paladin-retribution/WakeOfAshes/execution-sentence-on-target | candidate | — | Execution Sentence | Wake of Ashes before Execution Sentence | Binary: any enemy carrying the debuff. Tests any enemy, not the Wake's target, so cleave can pass falsely, and an Execution Sentence cast just before can fail. Value from the log by comparing Wake damage with the debuff against without; top players may press Wake on cooldown regardless, which would fail the premise. Guide text assumes Radiant Glory makes Wake the main cooldown (doubtful). Low expected value. Phase 3 (2026-10-17), **measured, not built** (negligible). Execution Sentence stores ~19–20% of the player's damage on its target over its 8s (hit ÷ damage on the target during the debuff, one enemy). A Wake pressed 1–5s before an Execution Sentence (the next one within 6s) loses that share of its damage: 13–54k each. Never on the top six; on the weaker 0–6 a pull, at most 0.18M (半夏丶 RbhPKYWd6t1nAC3f and 乌克兰外星人 MaWQwnygjkh1czL8, who press Wake first every minute), Polpo 20k on the case study (5:02). |
| paladin-retribution/ArtOfWar/procs-consumed | unverifiable | — (`checkProcs` doesn't see it) | Art of War | a proc refreshed or left unused for 10s | Consumed share under 95 / 90 / 85%, not rendered. **Likely bug:** the window opens only when Blade of Justice was on cooldown at the proc, so a proc arriving with Blade ready never counts as consumed and the share is understated. The app counts expiries from the buff stream rather than a share. Phase 3 (2026-10-17): **not covered**, `checkProcs` only expires the procs in procs.ts, and Art of War (406086) can't join them. Of its 1,682 removals on the samples 1,131 come with a Blade of Justice, but 514 come with no cast at all, at spans from 0.1s to 19s (Tracer GndQ9VFWtLzNjKpk: applied 2.51, removed 4.51; 10.85 → 13.81), with one 20.00s span and no whole-second cluster. So the buff ends for reasons the log doesn't show, and no duration separates an expiry from those. A reset wasted at full charges isn't logged either. Holy Power capped prices a Blade of Justice pressed late into a full bar. |
| paladin-retribution/ShieldOfVengeance/absorb-used | no-damage | — | Shield of Vengeance | — | A defensive. **Likely bug:** the cast listener is on Divine Protection, not Shield of Vengeance, so the denominator follows the wrong spell. |
| paladin-retribution/AlwaysBeCasting/downtime | superseded | `checkGcdGaps` | none | idle time | Above 15 / 25 / 35% idle, looser than core's, whole fight, Stasis counted; no spec code reads the getter, so the guide shows the core grade. The app values each gap less forced time. |
| paladin-retribution/MeleeUptime/swing-gap | candidate | — | Crusading Strikes (the swing proxy) | out of melee range | Core's rule (core.md), tracked on the Crusading Strikes spell, which may be absent without the talent. Doubts as in core: can't tell an untargetable boss from a player out of range, and most out-of-range time is mechanics. The case study recorded ability uptime 80.1% vs 91.3%; the app's gap check prices idle GCDs but not range. Build only for out-of-range time with no forced window. Phase 3 (2026-10-17), **measured, not built** (it fires on the top players). Every player takes Crusading Strikes, which logs a cast per swing (median 1.45–1.80s). A trial priced each swing gap over 2.2× the median, less forced, movement and dead time, at the player's average swing: Entombed Sentinels top 0–102k (Tracer 102k, Yenvenger 71k, Yappin 50k, Blabang 0), weaker 0–293k (Mushtard); on Vashnik the 100th-percentile Pipala 1.12M (11 gaps, 49.7s) against Zebroz 0.98M, Solidjen 374k, 半夏丶 140k, Pçpaladin 0. The Vashnik gaps are fight movement the context doesn't model (Venoms, Plague Froth walks), which the user's leniency rule leaves unjudged. |
| paladin-retribution/Abilities/wake-of-ashes-efficiency | verified | `checkCooldownDrift` (Wake of Ashes, 30s) | none | Wake held | 85% target, whole fight; hold only for adds within 15s. Case study: 89%, the holds were in Stasis, no lost use (WoWAnalyzer counts forced time as ready). Phase 3 (2026-10-17): a use was valued by its 255937 hit only; now with 405345, 405350 and its Truth's Wake DoT (403695), 160–410k a use, and `burstHold` (Vashnik's Imbibes, Ula'tek's Hearts). Top players none; weaker 69–156k (Polpo Coiled Altar Pull 1, 2:58). |
| paladin-retribution/Abilities/avenging-wrath-efficiency | verified | `checkCooldownDrift` (Avenging Wrath, 60s) + `burstGcdFindings` | enabled only without Radiant Glory | Avenging Wrath held | 90% target, major. Case study 100%. Crusade has no entry of its own, and the extra Avenging Wrath from Instrument of Retribution is not credited by WoWAnalyzer. Phase 3 (2026-10-17): **the drift never showed before**: Avenging Wrath deals no damage and isn't a party buff, so a lost use was worth 0. Now valued by what the player's own windows added (`avengingWrathValue`: the window bonus from non-crit hits, capped at 30%; uncapped +38–49% on the top players, crit 48–58% against 37–38%), 1.2–3.1M a use, and `burstHold`. The 99.8th Pçpaladin (1NL29tyvbzGhZgPK) presses it 2s after each Vashnik Imbibe, 84s apart (5 uses where 7 fit): 5.01M before `burstHold`, 0 after. Top players none; Mushtard 1.95M (wWx8B1GPZMLghAyz, 19.8s held, one more use before the kill, 3:06). Nobody plays Crusade. |
| paladin-retribution/Abilities/execution-sentence-efficiency | verified | `checkCooldownDrift` (Execution Sentence, 60s) | Execution Sentence | held | 90% target. Case study 100%. Phase 3 (2026-10-17): **the drift never showed before**: the cast (343527) hits as 387113 and 1260251, so a use was worth 0. Now `damageIds` (0.3–2.2M a use) and `burstHold`. Top players none (Pçpaladin's Imbibe holds excused, 4.18M before); Mushtard 584k (3:06). |
| paladin-retribution/Abilities/divine-toll-efficiency | verified | `checkCooldownDrift` (Divine Toll, 60s, `divineTollValue`) | Quickened Invocation (60s → 30s) | Divine Toll held | 90% target. Not tracked: intervals spread too far (shortest 30s, median 62s, tracked-cooldowns.ts), which is the Quickened Invocation choice and the Holy Power-side resets, not one fixed recast. Would be a per-player recast by talent, valued by the Divine Toll's Judgments and the Holy Power it grants; whether the talent is readable from the log is unchecked. Case study: ~27s of holds outside Stasis, at most one cast lost just before the kill. Low expected value. Phase 3 (2026-10-17), **built**. On Retribution alone the recast is a clean 60s (shortest 60.0s, typical 62–75s, 58 player-pulls; the survey's 30s was another spec's), so nobody here plays Quickened Invocation. A use is its thrown hits (Hammer of Wrath 1279408, or Judgment 406957 when Hammer of Wrath isn't usable) plus Divine Resonance (1266308, three stacks): each makes the next Hammer of Wrath or Judgment hit about twice as hard (Tracer 230k vs 117k), less a GCD. 0.13–0.33M a use. Top players none (Pçpaladin's Imbibe holds excused by `burstHold`); Polpo 132k on the case study (3:16, one more before the kill, as the case study said), 328k at Coiled Altar Pull 1 (2:10, 81.5s held), Hèff 290k, Jgwentworth 302k and 322k. |
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

Phase 3 worked the list below (2026-10-17); none is left open.

1. Divine Toll drift: built (tracked at 60s, valued with Divine
   Resonance). On the way, the tracked cooldowns already `verified` turned
   out to be worth 0 a use (Avenging Wrath, Execution Sentence) and were
   valued; all four honor the fight's hold windows.
2. Hammer of Light after Wake of Ashes: measured, not built (33 of 33 on
   the three Templar pulls). Hammer of Light made a GCD press (game.ts).
3. Expurgation uptime: measured, not built (top 18–62k a pull).
4. Melee range: measured, not built (1.12M on the 100th-percentile
   Pipala).
5. Execution Sentence before Wake: measured, not built (≤0.18M, never on
   the top players).
6. Outside the ledger: Divine Arbiter (a proc that runs out at 20s, not in
   procs.ts) built as "Divine Arbiter expired unused".

Held for the user's review: none of this spec's rows is `wrong`. The
`no-damage` rows are unchanged from phase 2. One decision about another
module: Ula'tek's hold windows run from P2's start to the Heart (the P2
adds don't move the pool), which also cut other specs' holds on the one
Ula'tek pull on disk (commit 4d92a42 lists them).
