# WoWAnalyzer audit: Frost Death Knight

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Death Knight shared layer,
  then the spec), spot-checked at their source lines (4 of
  4 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** lagging. It declares 12.0.7 while retail in the clone is
  12.1.0, and is flagged partly maintained (one maintainer). Last change
  2026-05-02 (Frostscythe, Empower Rune Weapon and Breath of Sindragosa
  updated); before that 2026-04-27 ("Enabling Frost DK" for 12.0.5). The
  changelog isn't wired into the spec's config. There is no priority list,
  no checklist and no suggestion text: the only graded surface is the
  guide, and every threshold getter in the folder is defined but read by
  nothing in it. Rows that come from a getter alone are marked as such.
  Rules for talents that may have changed since 12.0.7 (Frostscythe,
  Breath of Sindragosa, Reaper's Mark, Reaper's Onslaught, the two-stack
  Killing Machine) are doubtful in the notes; none is made a candidate on
  that basis.
- **App:** `lib/damage/wow/specs/melee.ts` (`"Frost Death Knight"`: the
  Pillar of Frost window through `burstGcdFindings`, Runic Power at the
  cap), `tracked-cooldowns.ts` (Pillar of Frost, Reaper's Mark,
  Frostwyrm's Fury, all marked unverified: 2 players in the survey),
  `potion.ts`, generic checks. No case study: the spec has never been
  checked against a WoWAnalyzer page, so nothing here is `verified`.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Frost sets or
  adds. The Death Knight shared rules (rune tracker, rune forge checker)
  are listed here because Frost overrides their thresholds.
- **Phase 3:** not started.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| deathknight-frost/AlwaysBeCasting/downtime-pct | superseded | `checkGcdGaps` | none | idle time | Frost loosens the core line to 30 / 35 / 45% of the whole fight idle (core is 5 / 10 / 15%), an allowance for melee range time. Same whole-fight denominator as the core rule; forced time counts as idle. Not read by the guide. |
| deathknight-frost/KillingMachine/proc-efficiency | covered | `checkProcs` (expiries) | Killing Machine (two-stack form assumed, hard-coded) | a proc left to expire or overwritten | Share of procs consumed; getter at 95 / 90 / 85%, guide bar in three bands. A proc lost while the player had fewer than two runes is excused, so rune starvation hides waste. Expiry inside forced time counts as waste there. The generic proc check finds a buff's consumer from the log and flags expiries; whether it picks up Killing Machine and Rime on a Frost pull is untested (the 2-player survey logs both: about 53 and 19 a minute). Two-stack assumption doubtful for 12.1.0. |
| deathknight-frost/Rime/proc-efficiency | covered | `checkProcs` (expiries) | none | Rime left to expire or overwritten | Same shape: consumed, refreshed, expired; getter at 95 / 90 / 85%. Counts a refresh as waste though the proc is not lost, only its timer reset; the app flags expiries only. Hard-coded 15s duration. |
| deathknight-frost/RuneTracker/rune-overcap-pct | candidate | — | none | runes sitting at the cap | Frost's setting: wasted share above 10 / 20 / 30% (class 5 / 10 / 20%). Whole-fight efficiency, forced time counts as ready, six-rune cap hard-coded. The app's resource-cap check reads only Runic Power (it isn't looking at runes). Value: rune-regen lost × damage per rune spent, rebuilt from the log's rune counts if they appear on cast resources (not checked). What separates a mistake from play: top players cap runes deliberately while waiting for Killing Machine, Rime or Pillar; and the spec's own guide only says "spend at four or more". Low value. |
| deathknight-frost/RuneTracker/rune-efficiency-floor | superseded | — | none | as above | The same efficiency as a floor (90 / 80 / 70%); getter only. Covered by the row above if built. |
| deathknight-frost/RunicPower/waste-pct | covered | `primaryResourceCapFindings` | none | Runic Power generated into a full bar | Waste share above 5 / 10 / 15% of RP generated; getter only. The spec's own guide says RP waste is fine when the GCD goes to a rune spender. Inside Breath of Sindragosa WoWAnalyzer subtracts a modelled per-tick cost; the app sees only casts made at the cap, so waste during Breath rests on the log's cast-time RP. Valued by the app at units wasted × damage per RP spent. |
| deathknight-frost/BreathOfSindragosa/average-duration | wrong | — | Breath of Sindragosa | Breath ending before 60s | Mean cast length below 60 / 50.5 / 45s. The 60s ideal is hard-coded; a death or the fight ending cuts it; the guide text itself says not to extend it on purpose and marks every cast good. Doubtful for 12.1.0. Breath is a cost-per-tick channel, so a short one is a resource or fight-end fact the app already sees as RP and GCD gaps. |
| deathknight-frost/EmpowerRuneWeapon/cast-resource-waste | candidate | — | Empower Rune Weapon (shown only with Breath of Sindragosa) | Empower Rune Weapon cast with runes or RP nearly full | Any wasted rune or RP on the use downgrades it; never worse than "ok". Strict: no allowance for burst timing. Value would be RP at cast (logged before the cast) and runes if present, wasted × damage per unit. Top players use it for Breath and Pillar timing and accept waste; most of the loss is already in the Runic Power cap check. Low value. |
| deathknight-frost/Frostscythe/targets-per-cast | candidate | — | Frostscythe | Frostscythe cast into fewer than three targets | Share of casts hitting 3+ targets; getter at 95 / 85 / 75%, shown as a statistic only. The three-target line is hard-coded and hits are matched to the latest cast. Value: hits per cast from the damage events; loss = the player's own average Obliterate less the one-target Frostscythe, per cast. Separating a mistake from top play needs a same-boss reference: cleave bosses and Killing Machine empowered casts make top players use it into one or two targets. Doubtful for 12.1.0. The generic AoE-efficiency candidate in core.md is the same idea. Best of the candidates, still low-medium. |
| deathknight-frost/CastEfficiency/pillar-of-frost | covered | `checkCooldownDrift` (Pillar of Frost, 45s) | Pillar of Frost | Pillar held past ready | 85% target against a 60s cooldown, no reduction modelled. The survey's shortest interval over 22 casts is 45.0s (median 49.8s), so the 60s model is wrong and efficiency reads low for anyone with the reduction; the app measures 45s. Whole-fight denominator counts forced time as ready. Also the app's burst-window check judges GCDs inside Pillar (WoWAnalyzer grades none; its Pillar-window guide subsection is not wired in). |
| deathknight-frost/CastEfficiency/reapers-mark | covered | `checkCooldownDrift` (Reaper's Mark, 45s) | Reaper's Mark; Reaper's Onslaught (45s to 30s) | Reaper's Mark held | 90% target. Survey shortest interval 45.0s over 21 casts, so the app uses 45s; a player with Onslaught would read as drift only if the survey included one (it did not show a shorter interval). The only talent-driven reduction WoWAnalyzer models on a graded Frost ability. |
| deathknight-frost/CastEfficiency/frostwyrms-fury | covered | `checkCooldownDrift` (Frostwyrm's Fury, 91s) | Frostwyrm's Fury | Frostwyrm's Fury held | 90% target against a 180s cooldown. The survey's shortest interval over 11 casts is 91.9s (median 98.8s), so WoWAnalyzer's cooldown model is wrong or stale; the app measures 91s. Its advice allows holding for many targets; the grade does not. |
| deathknight-frost/CastEfficiency/empower-rune-weapon | wrong | — | Empower Rune Weapon | Empower Rune Weapon held | 80% target against a 120s cooldown. The survey logs 74 casts across two players with a median interval near 14s (shortest about 1s), so the cooldown is rebuilt by something (charges or refunds) and a flat 120s expectation cannot hold. Not tracked by the app for the same reason. |
| deathknight-frost/CastEfficiency/breath-of-sindragosa | candidate | — | Breath of Sindragosa | Breath held past ready | 90% target against a 120s cooldown. Survey: 11 casts, shortest interval 92.5s (median 98.2s), so the 120s model is stale. The app leaves Breath untracked on purpose (resource-gated: ready time is not the constraint). Value would be an interval check against the measured ~92s with ready time only when Runic Power allows, minus forced time, valued at a Breath use. Top players hold it for phases and mechanics. Low value. |
| deathknight-frost/CastEfficiency/arcane-torrent | candidate | — | Arcane Torrent (racial) | racial left unused | 50% target on a parser-level option. Not tracked; racials are not on the app's tracked list. Not worth building. |
| deathknight-frost/RuneForgeChecker/forge-flagged | no-damage | — | none | one of four flagged weapon enchants equipped | A gear check (enchant at the pull); the app does not grade gear (open question in core.md). Runeforges are a legacy mechanic and whether they exist in this expansion was not checked, so it may never fire. |
| deathknight-frost/statistics | no-damage | — | — | — | Display only: Frost Fever uptime over the whole fight (ungraded; the app has the Frost Fever dot on the survey list but wires no uptime check for Frost), Howling Blast cast without Rime on a target already carrying Frost Fever (tooltip says near zero is the aim; a statistic, not a grade), the Killing Machine, Rime, Runic Power waste, Breath duration and Frostscythe efficiency statistics, rune overcap and rune-count table, Rune of the Fallen Crusader strength. |
| deathknight-shared/utility | no-damage | — | — | — | Defensives and utility cooldowns (Anti-Magic Shell and Zone and their reductions, Lichborne, Death and Decay, Death Grip, Death's Advance) have cooldown entries for the timeline only. Not judged. |

Not rules (models the rules above rest on): the rune tracker (three hidden
two-charge cooldowns standing in for six runes, with regeneration
rescaled for Runic Corruption), its graph and details tab; the Runic
Power tracker (amounts scaled by ten, Breath modelled as a fixed cost per
damage tick); the Exterminate cost normalizer (rewrites rune cost on
Obliterate while Exterminate is up); the throughput tracker (Breath and
Pillar damage summaries); the Runic Power graph; the unused Breath guide
subsection; guide prose with no grade (spend runes at four or more, pair
Breath with Empower Rune Weapon, Howling Blast without Rime is almost
always a loss).

## Candidates left

Ordered by expected value; all are low, and most will likely fail phase 3.
Before any of them, measure the covered rows: run `checkProcs` on a Frost
pull and see whether Killing Machine and Rime appear as procs (the spec's
two proc rows are the ones WoWAnalyzer is probably right about).

1. **Frostscythe/targets-per-cast**: the one damage rule with a clean
   value (Obliterate less Frostscythe per one- or two-target cast), but
   needs a reference to separate it from deliberate cleave and empowered
   use.
2. **EmpowerRuneWeapon/cast-resource-waste**: mostly inside the existing
   Runic Power cap check; needs runes in the log to add anything.
3. **RuneTracker/rune-overcap-pct**: depends on rune counts being on cast
   resources; expected to be common to top players.
4. **CastEfficiency/breath-of-sindragosa**: only if Breath is ever seen
   held with Runic Power available and no mechanic; the cooldown model is
   the survey's, not WoWAnalyzer's.
5. **CastEfficiency/arcane-torrent**: skip.
