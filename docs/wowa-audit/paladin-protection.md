# WoWAnalyzer audit: Protection Paladin

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Paladin shared layer,
  then the spec), spot-checked at their source lines (4 of
  4 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** stale. Declares patch 12.0.7 and is marked Unmaintained (the
  description text still reads as maintained). Last changelog entry
  2026-09-06 (four entries); before that 2026-07-30 (Midnight re-enable,
  which only removed eight dead talents and fixed a rename, so the numbers
  on surviving talents were not re-checked). Rules resting on those
  numbers are noted as doubtful, not made candidates. The changelog has no
  per-module patch: every record is "12.0.7 declared, 2026-09-06 or
  earlier". The guide has a priority list and graded sections for Resource
  Use, Rotation, Defensive Cooldowns and Active Mitigation. **Every
  threshold getter in the feature and spell modules is unconsumed by this
  guide** (nothing in the spec folder reads them), so most thresholds below
  are rules that exist in code but are never shown as a grade.
- **App:** `lib/damage/wow/specs/tank.ts` (`PROT_PALADIN_CHECKS`: the
  Sentinel window only), `tracked-cooldowns.ts` (Sentinel, Divine Toll),
  `potion.ts`, generic checks. Case study: qpZx3mWaG7gcDdYB pull 3
  (Thatapaddlin) against VWMbYPRyxCAmhZFj fight 9 (Holyvi, 99th
  percentile); the header of tank.ts records what matched: Sentinel 98%,
  Divine Toll 91%, priority accuracy 81% vs 85%, ability uptime 73.0% vs
  83.4% (the app's small delays and gaps), one potion of two.
- **Phase 3:** not started.
- **Core rules** (active time, cast efficiency, potions, APL framework) are
  in [core.md](core.md); rows below cover only what Protection sets or
  adds. The Paladin class layer (holy power waste, Judgment consumption,
  Hammer of Wrath config) is included here since no other ledger holds it
  yet.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| paladin-protection/AlwaysBeCasting/downtime-pct | superseded | `checkGcdGaps` | none | idle time | Loosened for a tank: minor / average / major above 20 / 35 / 40% of the whole fight idle (core default is 5 / 10 / 15%). Unconsumed by the guide, which uses the core downtime section. Whole fight, so it counts forced time. Case study: the app showed 19.3s of small delays plus gaps. |
| paladin-protection/Guide/holy-power-time-at-cap | unverifiable | — | none | long stretches at 5 holy power | Perfect at or below 10% of the fight at the cap, then 15 / 20%. Holy power is logged on spenders only, so how long it sat at the cap isn't in the log (tank.ts: Shield of the Righteous cast at 5 of 5 on 43 of 90 casts, which can't tell waste from pooling). A cap held on purpose scores as failure. See the holy-power-waste candidate for the part that can be rebuilt. |
| paladin-shared/HolyPowerDetails/holy-power-waste | candidate | — | none | generators cast into a full bar | Minor / average / major above 2 / 5 / 8% wasted of everything gained. The app's `spenderSnapshotWaste` already rebuilds this for Retribution from spender snapshots and could be wired to Protection (not done: tank.ts says "not judged"). Valued as wasted holy power times Shield of the Righteous (or Hammer of Light) damage per point, which is small for a tank. Case study: WoWAnalyzer rates 7.0% and the 99th-percentile 3.7%, both "perfect", so the premise (a gap between good and weak players) is thin. Expect it to fail phase 3. |
| paladin-protection/AplCheck/hammer-of-light-free | candidate | — | Light's Guidance (Templar) | Hammer of Light not cast while its free-cast buff is up | Priority rule, "frequent" at over 40% of chances. The buff and the casts are both in the log, so a skip is a buff stretch with no cast. Value: Hammer of Light's damage (from the player's own hits) less the filler cast instead, plus the free cost. What separates a mistake from what top players do: holding it for a Sentinel window or an add pack; check the top players' delay between buff and cast. Single-target rule, pre-pull casts ignored, and the label may name the wrong buff. Templar rotation is from 2025; the cost was corrected 2026-09-06. |
| paladin-protection/AplCheck/avengers-shield | candidate | — | none | a hammer or Consecration cast with Avenger's Shield ready | Priority rule: cast it after the rules above. "Ready" is the module's own cooldown model, but the resets are real: each Grand Crusader buff application is in the log and fully resets it, so ready time can be read from the log, not from WoWAnalyzer's model. Value: Avenger's Shield damage per cast less the filler cast instead, per cast delayed. Priority accuracy was 81% vs 85% in the case study (close), so expect a small gap. Separating mistake from habit: the top player's delay between a proc and the cast. |
| paladin-protection/AplCheck/avengers-shield-bulwark | superseded | — | Bulwark of Righteous Fury | a lower-priority cast while Avenger's Shield was ready | Ahead of Hammer of Wrath, Judgment and the builders when the talent is known. A static talent condition (buff stacks not modelled). Subsumed by the avengers-shield candidate. Doubtful: not re-verified for Midnight. |
| paladin-protection/AplCheck/hammer-of-wrath-window | candidate | — | Hammer of Wrath; Avenging Wrath (Sentinel replaces it) | another cast chosen while Hammer of Wrath was usable | Cast whenever the target is in execute range or Avenging Wrath is up; 7.5s base cooldown, haste-scaled. The buff check names Avenging Wrath only, so a Sentinel window may not count as castable (WoWAnalyzer swaps the ability for players with Sentinel). Execute range is inferred from target health, which the log shows only roughly on bosses with scripted health. Value: Hammer of Wrath hit less the filler, per window. Low value; verify that top players use it in Sentinel before building. |
| paladin-protection/AplCheck/judgment | unverifiable | — | Crusader's Judgment (extra charge) | a lower-priority builder with Judgment ready | Cast Judgment next, no condition. Its cooldown is cut by Grand Crusader (3s, 6s with Crusader's Judgment, amounts hard-coded) and server-side cooldown reductions aren't logged (dps-analysis.md), so ready time can't be proven from the log. |
| paladin-protection/AplCheck/hammer-shake-heavens | superseded | — | Blessed Hammer or Hammer of the Righteous; Shake the Heavens | spender or Avenger's Shield chosen while the buff was up and a hammer was ready | A builder ordering rule for one buff; builders are interchangeable for idle, which `checkGcdGaps` counts, and the order costs only their damage difference. Doubtful: the hero tree dependency is unknown and buff duration isn't checked. |
| paladin-protection/AplCheck/hammer-filler | superseded | `checkGcdGaps` | Blessed Hammer or Hammer of the Righteous | Consecration cast with a hammer ready | Hammer as the builder filler after Avenger's Shield. Charges (3 or 2) and the 5s haste-scaled cooldown are hard-coded. Idle is the loss that matters and the gap check has it. |
| paladin-protection/AplCheck/consecration-filler | superseded | `checkGcdGaps` | none | Consecration cast ahead of a ready higher spell | Lowest-priority filler. Same reasoning as hammer-filler. The Lightsmith hero tree isn't covered at all (the guide warns Holy Armaments players). |
| paladin-protection/AplCheck/consecration-refresh | no-damage | — | none | effectively never | Recast when the buff is missing or under 2s (12s duration hard-coded). Marked optional, so skipping is never counted against the player; it also mostly gives mitigation. |
| paladin-protection/AplCheck/sotr-cap | unverifiable | — | Divine Purpose | a builder cast at 5 holy power with Shield of the Righteous available | Spend before generating at 5 holy power or with a Divine Purpose proc. Holy power is logged only on spenders, so "at 5" can't be seen on a builder cast. The proc is visible but the other half isn't. Whatever is recoverable is the holy-power-waste candidate. |
| paladin-protection/AplCheck/sotr-three | no-damage | — | Divine Purpose | never (optional) | Spend Shield of the Righteous at 3 or more holy power or on a proc. Optional, so skipping flags nothing; the buff is mitigation. |
| paladin-protection/HammerOfTheRighteous/filler-over-better-spell | superseded | — | Blessed Hammer or Hammer of the Righteous | hammer cast while Judgment or Avenger's Shield was ready | Bad if over 10 / 15 / 25% of casts. Rests on the module's own cooldown model; the priority rows cover the same ground and the guide doesn't read it. |
| paladin-protection/OvercapShieldOfTheRighteous/buff-overcap | no-damage | — | none | Shield of the Righteous cast with 9s or more left on its buff | The buff adds 4.5s up to a 13.5s cap; a cast is forgiven if no builder was ready. A statistic of lost buff seconds, no grade, and the buff is mitigation. If a mitigation view wants buff uptime, this is the model (lib/mitigation/); the audit is about damage. |
| paladin-protection/ShieldOfTheRighteous/physical-hits-covered | no-damage | — | none | physical hits taken without the buff | Below 95 / 90 / 85% of hits covered. Survivability, counts hits not damage, statistic box only. Could feed lib/mitigation/ as a coverage number weighted by damage. |
| paladin-protection/Consecration/hit-coverage | no-damage | — | none | hits taken outside the Consecration | Below 95 / 90 / 80%. Survivability (armour), statistic only, forced movement not excused. |
| paladin-protection/NoDamageShieldOfTheRighteous/cast-hit-ratio | candidate | — | none | Shield of the Righteous cast with no enemy in front | Below 98 / 95 / 92% of casts that damaged an enemy. A cast with no target loses its damage. Log-visible, but fires only when the boss is untargetable or out of reach, which is forced time the app already excludes; expect nothing. Not shown in the guide. |
| paladin-shared/Judgment/judgment-consumption | no-damage | — | none | Judgment cast with no spender before the debuff drops | Only Retribution gets the suggestion; for Protection the tracker is a statistic, counting Shield of the Righteous as the one consuming spender. Hits counted per target, so cleave inflates it. Display only here. |
| paladin-protection/WordOfGlory/overheal-casts | no-damage | — | none | Word of Glory at near full health | Healing. Over 10 / 15 / 20% of casts non-crit with over 25% overheal. |
| paladin-protection/WordOfGlory/wasted-shining-light | no-damage | — | Shining Light | free Word of Glory left to expire | A raw count (1 / 3 / 4), healing. Valiance ties it to the Holy Armaments cooldown (see below). |
| paladin-protection/Abilities/sentinel-efficiency | verified | `checkCooldownDrift` (Sentinel) | Sentinel (takes the place of Avenging Wrath) | Sentinel held | 90% target, flagged, whole-fight. The app tracks it at 60s (shortest interval 59.9s over 51 casts, first use median 1.7s) while WoWAnalyzer models 120s; the gap is probably Righteous Protector (below), but that wasn't measured. Case study: 98%, matched. Plus `protPalSentinel` values GCDs in the window. |
| paladin-protection/Abilities/avenging-wrath-efficiency | candidate | — | Avenging Wrath (without Sentinel) | Avenging Wrath held | 90% target, 120s, the Sentinel talent's alternative. No sample player runs it (all eight Protection players had Sentinel), so it can't be tested; track it only if one shows up. |
| paladin-protection/Abilities/divine-toll-efficiency | verified | `checkCooldownDrift` (Divine Toll) | Divine Toll | Divine Toll held | 90% target, 60s, cooldowns category. Tracked at 60s (47 casts). Case study: 91%, matched. |
| paladin-protection/Abilities/avengers-shield-efficiency | candidate | — | Grand Crusader | Avenger's Shield held | 90% target, flagged, 15s haste-scaled with Grand Crusader resets. Not tracked (resets break the interval). Same check as the avengers-shield candidate above, valued as a late cast, not an efficiency share. |
| paladin-protection/Abilities/holy-armaments-efficiency | candidate | — | Holy Armaments (Sacred Weapon); Forewarning; Valiance | Holy Armaments held | Cooldowns category but WoWAnalyzer sets no efficiency target. Not tracked (reductions spread the interval). The reductions are: Forewarning takes 12s per rank off the 60s base (2 charges), and Valiance takes 3s off per Shining Light consumed. This is the `spentCooldownDrift` shape (`reduceOn` the Shining Light buff being consumed, a fixed 3s per event). Whether a use adds damage for the tank isn't established; value would come from the weapon buff in the player's own hits. Low. |
| paladin-protection/Abilities/builder-efficiency | superseded | `checkGcdGaps` | Blessed Hammer, Hammer of the Righteous, Judgment, Consecration, Hammer of Wrath | — | Blessed Hammer 90% (not flagged), Judgment default (flagged), the rest none. Charge builders on short haste-scaled cooldowns; a cast held back is idle, which the gap check counts. |
| paladin-protection/SpellUsable/reductions | superseded | recast fitting in tracked-cooldowns.ts | Grand Crusader; Righteous Protector; Gift of the Golden Valkyr; Valiance; Unbreakable Spirit | — | The module hard-codes cuts: Grand Crusader on Judgment and a full Avenger's Shield reset (buff-derived, amounts hard-coded); Righteous Protector, 2s off Sentinel (or Avenging Wrath) and Guardian of Ancient Kings per Shield of the Righteous or Word of Glory cast (the code also fires on Word of Glory, against its file comment); Gift of the Golden Valkyr, per Avenger's Shield hit off Guardian (the comment and the constant disagree). Righteous Protector and Gift of the Golden Valkyr are doubtful: not re-verified for Midnight. The app fits recasts from the log instead. |
| paladin-protection/Defensives/utility-and-defensives | no-damage | — | Ardent Defender, Guardian of Ancient Kings, Divine Shield, Lay on Hands, Blessing of Protection/Sacrifice/Freedom/Spellwarding, Divine Steed, Rebuke, Hammer of Justice, Blinding Light | — | Defensive timeline (Guardian credited 50%, Ardent Defender 20% plus 10% per Improved rank, against damage spikes), the core mitigation check configured with Shield of the Righteous for physical hits and Ardent Defender / Guardian / Sentinel for any hit, and cast-efficiency targets from 10% (Lay on Hands) to default. Utility and defensives aren't judged. The spike-versus-cooldown overlay may be worth a look for `lib/mitigation/`; not damage. |
| paladin-protection/statistics | no-damage | — | — | — | Display only: Consecration and Shield of the Righteous coverage, Shield of the Righteous cast hit ratio and overcap seconds, Blessed Hammer damage reduction (a hard-coded share of attack power), First Avenger bounces, Redoubt stacks, Grand Crusader resets and chance chart, Righteous Protector and Gift of the Golden Valkyr reduction totals, Divine Purpose, Dusk and Dawn, Lightbearer, Holy Power per minute and wasted. |

Not rules (models the rules above rest on): the holy power tracker (which
lowers a spender's cost while a free-cost buff is up), the Grand Crusader
event links (matching the buff to the hammer, dodge, parry or critical
Judgment that caused it), the Guardian of Ancient Queens normalizer, the
defensive buff link normalizer and aura list, the empty haste override, the
SpellUsable override (free casts don't start cooldowns), the Active
Mitigation view (a work-in-progress Consecration armour timeline), the Word
of Glory timing tab, the builder usage chart, and the spender and
generator lists. An unused private builder helper in the builder-use file
is dead code.

## Candidates left

All of these are cheap and most will fail phase 3; the case study found
the Protection gap was idle and a potion, not rotation order.

- **avengers-shield** (and its efficiency row): the one rule with a
  log-readable ready time (Grand Crusader buff). Best of a weak set; value
  as the damage of a delayed Avenger's Shield less the filler.
- **hammer-of-light-free**: a log-visible buff with a clear cost to
  skipping; check the top player's delay and window holds first.
- **holy-power-waste**: wire the existing snapshot rebuild; expect the
  7.0% vs 3.7% pattern, which is within "perfect".
- **hammer-of-wrath-window**: low; check Sentinel windows first.
- **holy-armaments-efficiency**: reduction-driven, damage value unknown.
- **avenging-wrath-efficiency**: needs a sample with the talent.
- **cast-hit-ratio**: expected to fire only on forced time.
