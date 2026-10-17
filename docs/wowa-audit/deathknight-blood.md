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
  Dancing Rune Weapon window, Blood Plague uptime, Runic Power at the cap),
  `tracked-cooldowns.ts` (Dancing Rune Weapon, Raise Dead), `potion.ts`,
  generic checks. Case study: qpZx3mWaG7gcDdYB pull 3 (Veinglas) against
  ACmXHMFtaPLR9k8w's Frostydn (99th percentile); the header of tank.ts
  records what matched: Runic Power wasted 354 vs 48 on the page against
  115 vs 40 from the cap check (casts made at the cap only), worth little
  because Death Strike is mostly a heal; runes wasted show up as idle
  (74% vs 86% uptime, small delays 18.2s vs 6.8s); the Marrowrend and Death
  Strike usage flags (15 vs 12) are not damage.
- **Phase 3:** not started.
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
| deathknight-blood/RunicPowerTracker/rp-waste-grade | covered | `resourceCapFindings` (Runic Power, tank.ts) | none (Ossuary's 5 Runic Power saving is in the tracker) | Runic Power generated into a full bar | Wasted share of generated: below 2% Perfect, 5% Good, 10% Ok; lists the worst 8-second windows. App reads only casts made at the cap (logged on every cast, builders too), so it sees 115 vs 40 where the page reads 354 vs 48; a per-cast rebuild was no closer and not adopted. Passive gains while capped are the unverifiable part (core.md). Valued at Death Strike damage per Runic Power, small: even 354 was about 0.9M. Counts waste during forced no-spend time. |
| deathknight-blood/RunicPowerDetails/rp-waste-pct | superseded | `resourceCapFindings` | none | the same waste | Older 5 / 10 / 15% cut-offs for the graded box above; a card only. |
| deathknight-blood/RuneWaste/marrowrend-dc-overuse-grade | candidate | — | Exterminate; San'layn; Soul Reaper; Dancing Rune Weapon | Marrowrend or Death's Caress cast while Bone Shield is high | Share of checked rune-spender casts that were a Marrowrend or Death's Caress with Bone Shield above 4 stacks and over 4.5s left (30s duration), with exceptions. Below 5% Good, below 15% Ok, never Perfect. The denominator is every cast the list checks. Tank.ts: the Marrowrend flags (15 vs 12) "aren't damage". Value: the Heart Strike damage given up per swap (Heart Strike vs Marrowrend damage per rune from the player's own hits), less nothing else: Bone Shield is also defence. Phase 3 would have to show top players swap far less; a swap during a tank-swap or Bone Shield refresh is what separates habit from mistake. Likely a small number; low expected value. |
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
| deathknight-blood/CastEfficiency/drw-graph | covered | `checkCooldownDrift` (Dancing Rune Weapon, 90s) | Dancing Rune Weapon | Dancing Rune Weapon held | 90% target, whole-fight. Tracked in tracked-cooldowns.ts: shortest interval 90.0s over 69 casts, first use about 2.1s. Counts forced time as ready; the app counts whole lost uses less forced time. The window itself is `bloodDrw` (`burstGcdFindings`): a GCD short in the window loses the Rune Weapon's copy too, valued by the Rune Weapon's damage ÷ the DK's own in that window. No case study line for the cooldown itself, so covered, not verified. |
| deathknight-blood/CastEfficiency/raise-dead | no-damage | `checkCooldownDrift` (Raise Dead, 120s) | Death's Messenger (30s less per rank) | — | Declared cooldown only, no target and not in the guide. Tracked by the app anyway (min 120.0s over 37 casts); the ghoul's damage isn't a Blood damage rule. |
| deathknight-blood/CastEfficiency/blood-boil | candidate | — | none modeled | Blood Boil held with a charge recharging | 85% target, 7.5s haste-scaled, two charges; not in the cooldown graph, so not shown. Haste scaling uses the core hand-kept table. Value: the casts lost at Blood Boil's damage per cast from the player's own hits; app has `chargesAt` for charged cooldowns. It is a filler with free casts, so idle is the same loss as the gap check counts: expected value low, most likely superseded in phase 3. |
| deathknight-blood/CastEfficiency/death-and-decay | candidate | — | Death's Echo (second charge); Crimson Scourge | Death and Decay held, or a Crimson Scourge proc not spent | 80% target, 15s; the proc ends its cooldown, so the interval spreads (the tracked-cooldowns.ts "spreads too far" case). The reduction rule is Crimson Scourge: one proc ends the cooldown at once, a reduceOn-style rule for `spentCooldownDrift` with a pre-pull value if the buff is up at the pull. Value per use: the Death and Decay damage taken per second standing times the time lost. Doubtful: talent status since 12.0.1 unchecked. Phase 3 must show a spread between top players and weaker ones in standing time; movement is the leniency case. Modest expected value. |
| deathknight-blood/CrimsonScourge/wasted-procs | candidate | — | Crimson Scourge | a free Death and Decay proc expiring | Wasted procs above 5 / 10 / 15%; a proc in the last 8s of the fight excused. A card only. Same rule and same note as the Death and Decay row; refreshes of a proc already up aren't counted. Doubtful for the same reason. |
| deathknight-blood/DeathAndDecayUptime/standing-uptime | candidate | — | none | time out of one's own Death and Decay | Below 60 / 50 / 40% standing; module added 2026-09-24, a card only. Counts mechanics that force movement against the player, so the user's movement leniency means it has to read forced and movement windows; the value is the Death and Decay damage per second standing. Low value; build only after phase 3 shows top players stay in it far more. |
| deathknight-blood/BloodPlagueUptime/target-uptime | covered | `dotUptimeFindings` (Blood Plague, tank.ts) | none | Blood Plague left off | Below 95 / 90 / 80% of the whole fight, pooled over enemies; a card only. The app measures from first application, less forced time. No case-study line. |
| deathknight-blood/WastedExterminate/wasted-stacks | candidate | — | Exterminate; Reaper's Mark; Dancing Rune Weapon | an Exterminate stack gained at the cap | Models up to two stacks, two per Reaper's Mark, one per Dancing Rune Weapon cast, 30s duration, and assumes one stack if the buff is up at the pull. The newest work in the folder (2026-09-25). A statistic with a table; the extract notes a changelog entry but no threshold. Value: the empowered Marrowrend's damage over an ordinary one. Needs the buff stacks in the log to be reliable, and the talent may have changed again. Phase 3 would need to show wastes differ by player. Low-to-moderate. |
| deathknight-blood/MarrowrendUsage/wasted-stacks | no-damage | — | Exterminate (exclusion) | Marrowrend cast above 7 stacks | Bone Shield stacks wasted, above 0 / 10 / 20%; a card and a timeline note. The value of a Bone Shield stack is defence. Covered in effect by the overuse grade row if that is built. |
| deathknight-blood/InitialMarrowrendCast/first-under-drw | no-damage | — | Dancing Rune Weapon | first Marrowrend before the window | Opener ordering is a convention, not a rule; pre-pull casts ignored. |
| deathknight-blood/Ossuary/ds-with-ossuary | no-damage | — | Ossuary | Death Strike cast while Bone Shield is low | Share of Death Strikes cast with the Runic Power discount; a timeline note only. Death Strike is mostly a heal. Talent status since 12.0.1 unchecked (doubtful). |
| deathknight-blood/Ossuary/uptime | no-damage | — | Ossuary | — | Whole-fight buff uptime, below 95 / 90 / 80%; card only. Same doubt; a Stasis phase counts against it. |
| deathknight-blood/BoneShield/uptime | no-damage | — | none | — | Defence. Card with a stacks table. |
| deathknight-blood/DeathStrike/cast-reason-breakdown | no-damage | — | none | a Death Strike with no big damage in, not at low health, not near the cap | Each cast gets one reason (low health, large heal, blood shield, dump, other); only "other" is bad. Needs advanced hit-point logging. The final-pass test reads as if it turns almost every no-melee "other" into "dump" (a likely coding slip; the extractor wasn't certain). If it looks useful for `lib/mitigation/`, it is the Death Strike timing question on the tanking side, not a damage rule. |
| deathknight-blood/DeathStrike/double-cast-warning | no-damage | — | none | many Death Strikes within 3s of the last | Warns when more than 20% are a quick repeat and not a large heal. Text says "within 2 GCDs" against a fixed 3000ms constant. Healing. |
| deathknight-blood/DancingRuneWeapon/gcd-casts-during-drw | wrong | — | Dancing Rune Weapon | non-listed GCDs inside the window | Share of GCDs in the window that were Death Strike, Heart Strike, Blood Boil, Marrowrend or Consumption. Dead module with no output, and it contradicts the live priority list, which wants Soul Reaper and Vampiric Strike there. |
| deathknight-blood/Consumption/aoe-hits | candidate | — | Consumption | Consumption into fewer targets than its best | Hits per cast against the best seen, 95 / 90 / 80% (core default). Target count is guessed from the player's own hits. The Abilities comment says Consumption needs a rewrite for its empowered form, so the spell model is behind (doubtful). The app has no WoW AoE check. Decide with core's AoE row, not here; low value on a boss with few add waves. |
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
only Reaper's Mark is a damage cooldown; it is tracked for Frost in
tracked-cooldowns.ts but not for Blood, and no case-study measurement of
Blood's use exists.

## Candidates left

All unmeasured; most are expected to fail phase 3, in order of expected
value:

1. **Death and Decay with Crimson Scourge** (with the proc-waste row and
   the standing-uptime row): the one place the app has no equivalent and a
   talent models a cooldown reduction. A `spentCooldownDrift` rule, ended
   by the proc. Check first that the talent still exists in the current
   patch.
2. **Exterminate wasted stacks**: newest work, but depends on stack data
   being reliable in the log and the talent not having changed.
3. **Marrowrend / Death's Caress overuse**: valued by Heart Strike's lost
   damage; tank.ts already says the usage flags are not damage, so it is
   probably noise.
4. **Blood Boil efficiency**, **Consumption hits per cast**: filler spells
   whose loss the gap check already counts.
5. **Reaper's Mark use** (not a WoWAnalyzer rule): worth a look at the
   survey data before assuming anything.
