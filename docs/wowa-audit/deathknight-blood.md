# WoWAnalyzer audit: Blood Death Knight

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Death Knight shared layer,
  then the spec), spot-checked at their source lines (3 of
  3 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares patch 12.0.1, partially maintained, so **lagging**: the
  changelog has 12.1 work after the declared patch, and its last entry is
  2026-09-25 (Exterminate wasted-stack tracking). Rules for talents that
  have changed since 12.0.1 (Ossuary, Crimson Scourge, Relish in Blood,
  Voracious, Consumption's empowered form) are noted as doubtful, not made
  candidates. **Almost every threshold in the folder is dead code:** there
  is no checklist and no suggestion system, and the guide grades only
  downtime, the Death Strike section (Runic Power waste, rune efficiency,
  the rune-spender priority list, a Death Strike usage table) and a
  Dancing Rune Weapon cooldown bar. The unwired getters still show as small
  statistics and are recorded below so nobody reads them as things a user
  sees.
- **App:** `lib/damage/wow/specs/tank.ts` (`"Blood Death Knight"`:
  Dancing Rune Weapon window, Blood Plague uptime; Runic Power at the cap
  until phase 3 removed it), `specs/blood.ts` (since phase 3: free Death
  and Decay held, Dancing Rune Weapon's value),
  `tracked-cooldowns.ts` (Dancing Rune Weapon, Raise Dead, Reaper's Mark), `potion.ts`,
  generic checks. Case study: qpZx3mWaG7gcDdYB pull 3 (Veinglas) against
  ACmXHMFtaPLR9k8w's Frostydn (99th percentile); the header of tank.ts
  records what matched: Runic Power wasted 354 vs 48 on the page against
  115 vs 40 from the cap check (casts made at the cap only), worth little
  because Death Strike is mostly a heal; runes wasted show up as idle
  (74% vs 86% uptime, small delays 18.2s vs 6.8s); the Marrowrend and Death
  Strike usage flags (15 vs 12) are not damage.
- **Phase 3:** done 2026-10-17 on the 97 Blood DK player-pulls already on
  disk (71 reports, Mythic Vashnik, Entombed Sentinels and one Nek'zali; no
  fetch needed; two rankings queries for the percentile lines). Every
  number is in the header of `lib/damage/wow/specs/blood.ts`. Talents: 82
  player-pulls San'layn (every top player), 15 Deathbringer; nobody casts
  Consumption, Bonestorm or Soul Reaper; Bone Shield stacks to 12. Built
  (commit 7babeca): Dancing Rune Weapon drift valued by the Rune Weapon's
  hits (it was worth 0 a use and never showed; 0.6–2.5M a use, fires on 15
  weaker player-pulls, no top player); Reaper's Mark tracked for
  Deathbringer; "Free Death and Decay held" (Crimson Scourge held with no
  Death and Decay down: top 1–36k, weak up to 346k). **Removed for the
  user's review:** the shared Runic Power cap check for Blood (read
  0.34–1.56M on the top players by pricing Blood Boil, Death Grip and Dark
  Command, which generate none). Death Strike is 20–30% of a top Blood
  DK's damage in these logs (Lyrîa 20M, 180k a press), not "mostly a heal"
  as the case study had it.
- **Core rules** (active time, cast efficiency, potions, DoT uptime) are in
  [core.md](core.md); rows below cover only what Blood sets or adds. Death
  Knight shared rows (rune overcap, rune efficiency floor, rune forge
  checker) are judged here because Blood is the spec that reads them.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| deathknight-blood/AlwaysBeCasting/downtime-grade | superseded | `checkGcdGaps` | none | idle time | Blood's own bar: idle above 20 / 30 / 40% of the whole fight (the guide box passes up to 20%, warns to 30%). Very loose, so it rarely fires. Whole-fight denominator, forced time counted as idle. Case study: uptime 74% vs 86%, which the app shows as small delays and gaps. |
| deathknight-shared/RuneTracker/rune-overcap-pct | superseded | `checkGcdGaps` | none (Runic Corruption shortens the modeled regen) | runes sitting at the six-rune cap | One minus the mean efficiency of three fake rune cooldowns; above 5 / 10 / 20% wasted. Runes are inferred, not read from the log. Forced and Stasis time counts as full waste. Unspent runes only matter as fewer rune-spender GCDs, which the app sees as idle: the case study found the 21 vs 9 runes wasted showing up as idle. |
| deathknight-blood/RuneTracker/rune-efficiency-grade | superseded | `checkGcdGaps` | none | the same stretches | The Blood grade over the same figure: 95 / 90 / 80% for Perfect / Good / Ok. Its box text tells the player low runes are fine when Runic Power and Bone Shield are healthy, while the grade fails them anyway. Shared floor record (`rune-efficiency-floor`) is the same number turned around; both are subsumed here. |
| deathknight-blood/RunicPowerTracker/rp-waste-grade | wrong (proposed) | — (the shared cap check was removed for Blood, 7babeca) | none (Ossuary's 5 Runic Power saving is in the tracker) | Runic Power generated into a full bar | Wasted share of generated: below 2% Perfect, 5% Good, 10% Ok; lists the worst 8-second windows. Phase 3: the app's cap check read 0.34–1.56M on the top players (Zerdk X618LRt7hPqzbVJj 1.56M: 26 casts at full, 16 of them Blood Boil, 5 Death Grip; Vipsxo tcdpmV7MBHK1jGYk 784k; Lyrîa kZnVcJYpKFRChTzb 689k) against 0.01–1.09M on the weaker. It priced casts that generate none: Runic Power to the next cast within 1.2s is 0 after 1,055 of 1,990 Blood Boils (2–3, passive regen, on most of the rest), 0 after Death Grip, Dark Command, Death and Decay; and the real generators log runes, not Runic Power (Heart Strike 936 of 7,683 casts carry it, Marrowrend 0 of 1,557). Rebuilt from Heart Strike and Vampiric Strike (+15 each, measured) at the player's Death Strike damage per point (3–4k): top 0–639k (Zerdk 8.4% of their gain, Lyrîa 460k / 5.0%, Bloodydexter 347k, the other top players 0–126k), weak 0–1.05M (Sosoevery wPmFHVKRQb31X97z 1.05M, Kaouettea 997k, many 0–100k): no separation, and a tank pools Runic Power for Death Strike's heal. Not built; the case-study note ("Death Strike is mostly a heal") no longer holds: Death Strike is 20–30% of a top player's damage. |
| deathknight-blood/RunicPowerDetails/rp-waste-pct | wrong (proposed) | — | none | the same waste | Older 5 / 10 / 15% cut-offs for the graded box above; a card only. Same evidence as `rp-waste-grade`. |
| deathknight-blood/RuneWaste/marrowrend-dc-overuse-grade | wrong (proposed) | — | Exterminate; San'layn; Soul Reaper; Dancing Rune Weapon | Marrowrend or Death's Caress cast while Bone Shield is high | Share of checked rune-spender casts that were a Marrowrend or Death's Caress with Bone Shield above 4 stacks and over 4.5s left (30s duration), with exceptions. Below 5% Good, below 15% Ok, never Perfect. Phase 3: Bone Shield stacks to 12 in these logs, and the top players cast Marrowrend at 9–12 stacks (Lyrîa kZnVcJYpKFRChTzb: 16 of 16 at 7+, most at 11–12; 蕾米蕾米蕾 20 of 21), so the 4-stack threshold flags every top player. A swap is worth ~25–45k (two Heart Strikes, 22–39k each, over a Marrowrend, 13–25k). Top players cast 1.3–3.2 a minute, the weakest San'layn up to 5 (Blowod 7pFPAqzc2NHLXjwZ 32 in 7:14, at 123k/s); Deathbringer players all cast more (19–53). Bone Shield is defence, so the refresh is the tank's call. |
| deathknight-blood/RuneWaste/apl-heart-strike | superseded | the overuse grade above | none | — | Heart Strike as the default rune spender; the rule only matters through the grade row. Single-target: no target-count condition, so cleave isn't rewarded for Blood Boil or Consumption (core.md, priority checker). |
| deathknight-blood/RuneWaste/apl-marrowrend-bone-shield | superseded | the overuse grade above | none | Marrowrend at 5+ stacks with time left | Marrowrend is correct only with Bone Shield at 4 stacks or fewer, or under 4.5s left, and no Dancing Rune Weapon. This is the violation the grade counts. A different number (7 stacks) is used in the unwired usage module. |
| deathknight-blood/RuneWaste/apl-dc-optional-refresh | superseded | the overuse grade above | none | Death's Caress when Bone Shield did not need it | Death's Caress is allowed only as an optional Bone Shield refresh (some top players do this a lot, per the comment). Optional rules can pass but never be required. |
| deathknight-blood/RuneWaste/apl-deaths-caress-fallback | superseded | the overuse grade above | none | — | Last default; the extract marks it non-damage. Counts toward the grade only as a Death's Caress violation. |
| deathknight-blood/RuneWaste/apl-exterminate-marrowrend | superseded | the overuse grade above | Exterminate (Deathbringer) | another spell cast while an empowered Marrowrend is available | First priority: the empowered cast is correct while an Exterminate buff is up. Stack count and cap aren't modeled here; the list names only Marrowrend although the empowered cast can log under another name. Doubtful: the talent was reworked in the 12.1 period and this list wasn't touched. |
| deathknight-blood/RuneWaste/apl-drw-marrowrend-refresh | superseded | the overuse grade above | Dancing Rune Weapon | — | During Dancing Rune Weapon, an optional Marrowrend near the end of the window to top Bone Shield up. A hard-coded 16s window, wrong if a talent changes the duration (doubtful). |
| deathknight-blood/RuneWaste/apl-drw-marrowrend-missing | superseded | the overuse grade above | Dancing Rune Weapon | no Marrowrend with Bone Shield nearly gone | Required during Dancing Rune Weapon when Bone Shield is at 1 stack or under 4.5s. Survival, not damage. |
| deathknight-blood/RuneWaste/apl-drw-soul-reaper | superseded | the overuse grade above | Soul Reaper; Dancing Rune Weapon | — | Execute-range Soul Reaper inside Dancing Rune Weapon (target at 35% or less). The comment admits the post-explosion case is unhandled. |
| deathknight-blood/RuneWaste/apl-drw-vampiric-strike | superseded | the overuse grade above | Vampiric Strike (San'layn) | — | Preferred while its trigger buff is up. The dead Dancing Rune Weapon module contradicts it. |
| deathknight-blood/RuneWaste/apl-drw-heart-strike | superseded | the overuse grade above | Dancing Rune Weapon | — | Heart Strike otherwise inside Dancing Rune Weapon. |
| deathknight-blood/RuneWaste/apl-soul-reaper | superseded | the overuse grade above | Soul Reaper | — | Execute-range Soul Reaper outside Dancing Rune Weapon, 35% hard-coded. A Soul Reaper skipped for Heart Strike isn't counted toward the grade at all. |
| deathknight-blood/RuneWaste/apl-vampiric-strike | superseded | the overuse grade above | Vampiric Strike (San'layn) | — | Correct while its trigger buff is up; San'layn only, other hero trees uncovered. |
| deathknight-blood/CastEfficiency/drw-graph | verified | `checkCooldownDrift` (Dancing Rune Weapon, 90s, valued by `dancingRuneWeaponValue`, blood.ts) | Dancing Rune Weapon | Dancing Rune Weapon held | 90% target, whole-fight. Phase 3: the tracked drift was worth 0 a use (the cast deals nothing; the copies log under the Rune Weapon pet) and never fired. Valued now by the Rune Weapon's hits a use less the average GCD: 0.6–2.5M. Shortest interval 90.0s, top players' medians 91–95s, held 1–30s over a pull, no use lost. Fires on 15 of 97 player-pulls, all weaker: Metalgear fh6bLKy12gzWvGCH Vashnik Pull 6 3.42M (134s and 151s apart, two uses, from 3:45), Flashdecomp 8AFnLQKdrcgawzDC 1.61M (182s from 0:01), Phageborn atJRCq3YM8P4KGpD 1.43M (one more fit at 6:11 before the 6:26 kill). The window itself is `bloodDrw` (`burstGcdFindings`): top 6–63k a pull, weaker 100–250k. |
| deathknight-blood/CastEfficiency/raise-dead | no-damage | `checkCooldownDrift` (Raise Dead, 120s, unvalued) | Death's Messenger (30s less per rank) | — | Declared cooldown only, no target and not in the guide. Tracked by the app but worth 0 a use, so it never fires. Phase 3: the ghoul is 38–147k a use, and the top players skip uses (蕾米蕾米蕾 J3ckBVtrZNfWv1h7 190s and 182s apart, Zerdk 190s / 197s), so valuing it would flag them for ~70–100k. Left unvalued. |
| deathknight-blood/CastEfficiency/blood-boil | unverifiable | — | none modeled | Blood Boil held with a charge recharging | 85% target, 7.5s haste-scaled, two charges. Phase 3: no recharge fits the log (Boiling Point, 1265968 / 1265982, resets it): three presses span 5.3–7.7s on the top players (p10), and Lyrîa presses 12.2 a minute. A lead, unpriced: top players press 10–14 a minute on Vashnik, 5–9 on Entombed Sentinels; the weakest 2.0–3.3 (Sosoevery wPmFHVKRQb31X97z 13 in 6:33 at 113k a press; Cocoá LCFp3wbHvQqNP4my, Nebyral, Läqueefa 3–3.3). |
| deathknight-blood/CastEfficiency/death-and-decay | covered | "Free Death and Decay held" (blood.ts) | Death's Echo (second charge); Crimson Scourge | Death and Decay held, or a Crimson Scourge proc not spent | 80% target, 15s. Phase 3: paid Death and Decays come 1–3s apart at times (charges) and the proc resets it, so no cooldown model fits; the time a free one (Crimson Scourge) was held with none down is the part that is certainly lost, priced by blood.ts. |
| deathknight-blood/CrimsonScourge/wasted-procs | covered | "Free Death and Decay held" (blood.ts) | Crimson Scourge | a free Death and Decay proc expiring | Wasted procs above 5 / 10 / 15%. Phase 3: Crimson Scourge (81141) lasts 15.0s (64 unconsumed removals at 15.0s, none longer). Expiries alone don't separate (0 on the top players, 0–4 elsewhere, most in Entombed Sentinels' forced time), and a whole Death and Decay less its GCD is worth ~0 to many players (19–47k of ticks against a 35–80k GCD). What separates is time held with no Death and Decay down: top 21–48s on Vashnik (Zerdk 21, Lyrîa 48), weak 130–292s; priced at the ticks plus Sanguine Ground (4%, measured) less the press, it reads top 1–36k, weak up to 346k (Flashdecomp 8AFnLQKdrcgawzDC Vashnik Pull 6: held 3:32–4:14, 40s with none down). Not in procs.ts. |
| deathknight-blood/DeathAndDecayUptime/standing-uptime | covered | "Free Death and Decay held" (blood.ts) for the ground; standing not judged | none | time out of one's own Death and Decay | Below 60 / 50 / 40% standing. Phase 3: standing uptime does separate (top 74–86% on Vashnik, the weakest 20–37%), but most of it is ground time (Flashdecomp: 7 Death and Decays in 6:21, 18% ground), which blood.ts prices; standing outside one's own ground is movement, which the user doesn't judge. Sanguine Ground's bonus, read from melee non-crit hits inside ÷ outside: median 1.04, quartiles 1.01–1.08, 97 player-pulls. |
| deathknight-blood/BloodPlagueUptime/target-uptime | verified | `dotUptimeFindings` (Blood Plague, tank.ts) | none | Blood Plague left off | Below 95 / 90 / 80% of the whole fight, pooled over enemies; a card only. The app measures from first application, less forced time. Phase 3: top players 97–151k a pull, weaker up to 397k (替身 MaWQwnygjkh1czL8). |
| deathknight-blood/WastedExterminate/wasted-stacks | wrong (proposed) | — | Exterminate; Reaper's Mark; Dancing Rune Weapon | an Exterminate stack gained at the cap | Models up to two stacks, two per Reaper's Mark, one per Dancing Rune Weapon cast, 30s duration. Phase 3, 15 Deathbringer player-pulls (none top; the best is Brucebones zBb3HQpZCkxAfvqn): one stack ran out (Flashdecomp 8AFnLQKdrcgawzDC, 30.0s), one other unspent at 25.3s, and 0–2 refreshes a pull. An Exterminate is ~240–320k, so at most ~0.3–0.5M on the worst pull, and no player differs. Negligible. |
| deathknight-blood/MarrowrendUsage/wasted-stacks | no-damage | — | Exterminate (exclusion) | Marrowrend cast above 7 stacks | Bone Shield stacks wasted, above 0 / 10 / 20%; a card and a timeline note. The value of a Bone Shield stack is defence. Covered in effect by the overuse grade row if that is built. |
| deathknight-blood/InitialMarrowrendCast/first-under-drw | no-damage | — | Dancing Rune Weapon | first Marrowrend before the window | Opener ordering is a convention, not a rule; pre-pull casts ignored. |
| deathknight-blood/Ossuary/ds-with-ossuary | no-damage | — | Ossuary | Death Strike cast while Bone Shield is low | Share of Death Strikes cast with the Runic Power discount; a timeline note only. Death Strike is mostly a heal. Talent status since 12.0.1 unchecked (doubtful). |
| deathknight-blood/Ossuary/uptime | no-damage | — | Ossuary | — | Whole-fight buff uptime, below 95 / 90 / 80%; card only. Same doubt; a Stasis phase counts against it. |
| deathknight-blood/BoneShield/uptime | no-damage | — | none | — | Defence. Card with a stacks table. |
| deathknight-blood/DeathStrike/cast-reason-breakdown | no-damage | — | none | a Death Strike with no big damage in, not at low health, not near the cap | Each cast gets one reason (low health, large heal, blood shield, dump, other); only "other" is bad. Needs advanced hit-point logging. The final-pass test reads as if it turns almost every no-melee "other" into "dump" (a likely coding slip; the extractor wasn't certain). If it looks useful for `lib/mitigation/`, it is the Death Strike timing question on the tanking side, not a damage rule. |
| deathknight-blood/DeathStrike/double-cast-warning | no-damage | — | none | many Death Strikes within 3s of the last | Warns when more than 20% are a quick repeat and not a large heal. Text says "within 2 GCDs" against a fixed 3000ms constant. Healing. |
| deathknight-blood/DancingRuneWeapon/gcd-casts-during-drw | wrong | — | Dancing Rune Weapon | non-listed GCDs inside the window | Share of GCDs in the window that were Death Strike, Heart Strike, Blood Boil, Marrowrend or Consumption. Dead module with no output, and it contradicts the live priority list, which wants Soul Reaper and Vampiric Strike there. Phase 3 re-check: the top players press Vampiric Strike and Death and Decay inside the window as a matter of course (Lyrîa kZnVcJYpKFRChTzb: 47 Vampiric Strikes and 17 Death and Decays inside Dancing Rune Weapon; Vipsxo 29 and 14), neither on the list, so the rule would fail them. Kept `wrong`; idle in the window is `bloodDrw`'s. |
| deathknight-blood/Consumption/aoe-hits | unverifiable | — | Consumption | Consumption into fewer targets than its best | Hits per cast against the best seen, 95 / 90 / 80% (core default). Phase 3: no sample player casts Consumption (0 of 97 player-pulls), nor Bonestorm or Soul Reaper. |
| deathknight-blood/DeathsCaress/bad-casts | no-damage | — | none | Death's Caress used in melee range or with Death and Decay ready | Needs player and target positions; count only, no output. Positioning, not damage. |
| deathknight-blood/RelishInBlood/rp-waste | no-damage | — | Relish in Blood | — | Runic Power from the talent that was wasted, above 0 / 20 / 40%. Same Runic Power as the cap check (valued small); talent status unchecked. |
| deathknight-blood/Voracious/uptime | no-damage | — | Voracious | — | Buff uptime that follows Death Strike casts, so the bar implies a cast rate nobody meets; healing. |
| deathknight-blood/CastEfficiency/lichborne | no-damage | — | Unholy Endurance; Death's Messenger | — | 50% target, minor. The comment says it is no longer a defensive; no damage in it. |
| deathknight-blood/CastEfficiency/vampiric-blood | no-damage | — | Red Thirst | — | Declared cooldown only. Every 10 Runic Power spent shortens it by 2 seconds (after Ossuary's discount), wasted reduction counted when already ready. A defensive: for `lib/mitigation/` the model would matter to when the cooldown is free; for the damage audit, not judged. |
| deathknight-blood/RuneForgeChecker/flagged-enchant | no-damage | — | none | a flagged weapon enchant | Tells the player to use Fallen Crusader over six others. Dead (no suggestion reader) and gear, which the app doesn't grade (core.md open question). The shared base `deathknight-shared/RuneForgeChecker/forge-flagged` is the same record. |
| deathknight-blood/statistics | no-damage | — | various | — | Display only: Blood Plague, Bone Shield, Death and Decay and Ossuary uptimes; Crimson Scourge wasted procs; Marrowrend bad casts; rune tracker card with a time-at-count table; Rune of the Fallen Crusader strength; Death Strike healing against half of damage taken; Death Strike Timing plot; talent cards (Bloodworms, Foul Bulwark, Heartbreaker, Hemostasis, Rapid Decomposition, Red Thirst, Visceral Strength, Will of the Necropolis, Essence of the Blood Queen); Dancing Rune Weapon in the damage summary. |
| deathknight-blood/utility | no-damage | — | — | — | Class utility and defensives: Anti-Magic Shell (40s with Anti-Magic Barrier), Anti-Magic Zone, Icebound Fortitude, Death Pact, Death Grip, Death's Advance, Wraith Walk, Asphyxiate, Mind Freeze, Blinding Sleet, Dark Command. The mitigation-check wiring (which buffs count as physical, magical or both) is a `lib/mitigation/` input, not a damage rule. Not judged. |

Not rules (models the rules above rest on): the rune tracker
(three two-charge fake cooldowns for six runes, spend from the shortest,
refund to the longest, rescaled on Runic Corruption), the Runic Power
tracker and its waste-window builder, the exterminate cost normalizer
(the log's cost field ignores the discount), the Bone Shield stack-time
histogram (15-stack cap, 30s duration hard-coded), the event normalizers
(Bone Shield order, resource order, Death Strike link, Blood Shield link),
the Essence of the Blood Queen haste feed, the Insatiable Blade stack rule,
and the core overrides (Abilities, GlobalCooldown, Channeling). Every rune
rule depends on the cost normalizer; the app needs none of it, since it reads
idle from the gaps.

Declared cooldowns with no target and no grade: Abomination Limb 90s,
Reaper's Mark 45s (30s with Reaper's Onslaught), Consumption 30s. Of these
only Reaper's Mark is a damage cooldown. Phase 3: tracked for Blood now
(Deathbringer, 15 player-pulls): shortest 45s (Hemojoshi ZvrLTQfk1zbAXMwB
presses every 45–53s), two 32s intervals on Venomdeath (a reset, so 45s is
lenient), 300–510k a use with its hits under 439843, 436304 and 439594. It
fires on Flashdecomp 8AFnLQKdrcgawzDC 1.10M (3 uses, 147s held), Lablood
348k, Maxd 385k, Lamagram 386k; not on the best Deathbringer players
(Brucebones, Хардбакска). The survey sweep reads it off the GCD (game
data) though its next press comes 0.78s+ later; if it's on the GCD a use
is priced ~4% high.

## Candidates left

None. Phase 3 (2026-10-17) built the Death and Decay / Crimson Scourge
rule and valued Dancing Rune Weapon's drift; the rest are proposed `wrong`
(Runic Power waste, Marrowrend overuse, Exterminate stacks) or
`unverifiable` (Blood Boil, Consumption), with their evidence above.
Open lead: Blood Boil presses (top 10–14 a minute on Vashnik, weakest 2.0)
have no recharge model.

Mitigation leads for `lib/mitigation/` (not built): Death Strike timing
(the cast-reason row) now trades against 20–30% of the player's damage;
Vampiric Blood's Red Thirst cut (2s per 10 Runic Power spent) decides when
it's free; Bone Shield stacks to 12 and the top players refresh at 9–12.
