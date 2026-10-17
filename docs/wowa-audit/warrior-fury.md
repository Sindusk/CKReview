# WoWAnalyzer audit: Fury Warrior

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Warrior shared layer,
  then the spec), spot-checked at their source lines (3 of
  3 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares 12.1, Foundation support level, not maintained. Its own
  description says the analyzer can parse logs only in a limited way and
  gives players no accurate guidance. Last change 2026-08-29 (priority-list
  cleanup and cleaner violation tooltips). Not a checklist spec: the guide
  has a disclaimer, the core active-time panel, a cooldown bar panel with no
  grading, and the priority list shown as "Rotation". The per-module
  threshold getters (Enrage uptime, rage waste, the cast counters) are not
  read by anything; only the downtime getter feeds a grade. One file
  (`talents/ImpendingVictory`) is dead code.
- **App:** `lib/damage/wow/specs/melee.ts` (`"Fury Warrior"`: the
  Recklessness window through `burstGcdFindings`, and Rage at the cap
  through `primaryResourceCapFindings`), `tracked-cooldowns.ts`
  (Recklessness 41s, Odyn's Fury 45s; the entry is marked unverified, two
  players), `potion.ts`, generic checks. **No case study:** no Fury page
  against a reference has been read, and melee.ts records none. The app has
  seen two Fury players in the survey, so every Fury number there is a
  survey bound, not a verified model.
- **Phase 3:** not started.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Fury sets or adds.
  The class layer's one rule (Bladestorm while not enraged) is a row here
  because Fury enables it.

## Ledger

The two priority lists are judged in groups. The list belongs to a hero
tree: Slayer (the Slayer's Dominance talent) has 14 rules, Thane (everything
else) has 15. The guide states the list is single target, built from
guides, and ignores adds, damage amplifiers, movement and the Rend talent.

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| warrior-fury/AlwaysBeCasting/downtime-pct | superseded | `checkGcdGaps` | none | idle time | Fury loosens the core bands: ok to 10%, then 15%, fail above. Whole-fight denominator, so forced time and untargetable phases count against the player; the app values each gap less forced time. |
| warrior-fury/AplCheck/slayer-and-thane-ordering (Slayer: Rampage in Recklessness with Bladestorm ready, Execute with Sudden Death in Recklessness, Execute, Raging Blow, Rampage, Bloodthirst; Thane: the same plus the Thane filler order) | superseded | `burstGcdFindings` (Recklessness) + `checkGcdGaps` | Slayer's Dominance; Hack and Slash; Reckless Abandon | a cast of a lower-priority spell while a higher one was ready | A first-match-wins list; a rule is "frequently skipped" at over 40% of its chances (core.md). Most rules only choose between builders of near equal weight, and the Recklessness versions are automatic upgrades of the same button (Crushing Blow for Raging Blow, Bloodbath for Bloodthirst), so the order changes little damage. Single-target: it cannot flag a missed cleave. The checker ignores pre-pull casts. The app counts the GCDs that fit and were pressed in the window, which is where most of the value is. |
| warrior-fury/AplCheck/slayer-rampage-to-enrage, thane-rampage-enrage-or-high-rage | candidate | — | Rampage; Enrage | Rampage affordable (80 Rage, less in Recklessness) and not cast while Enrage was down | The same event as MissedRampage/not-enraged-with-rampage-ready: a builder cast at 80+ Rage with no Enrage. Valued by the Enrage time lost: the delay until the next Rampage times the Enrage bonus, read from the player's own hits inside vs outside Enrage (as `observedWindowBonus` does for a window). Separating a mistake from play: top players hold Rampage for Recklessness windows and the Enrage refresh timing, so measure how late the next Rampage lands against how many 80+ Rage builders came first. Moderate value; the Rage cap check does not see it. |
| warrior-fury/AplCheck/rampage-high-rage (R3 R10 R31 R32 in the extract) and MissedRampage overcap rows | superseded | `primaryResourceCapFindings` | Anger Management (115); Reckless Abandon (120, outside Recklessness) | a builder cast at 100 to 120+ Rage | WoWAnalyzer flags builders cast well before the 100 Rage cap so the next builder won't be wasted; the app flags only Rage actually generated into a full bar. The hard-coded 100, 115 and 120 are preferences, not losses; Recklessness is excused from the 120 rule because overcapping there is accepted. Whole-fight Rage waste is the cap check's. |
| warrior-fury/AplCheck/thane-thunder-blast (R17 R21 R24 R29) | candidate | — | Thane hero tree; Thunder Blast; Avatar of the Storm; Storm Surge | Thunder Blast stacks not turned into casts while Thunder Clap was ready | WoWAnalyzer prefers Thunder Blast at two stacks. The Thunder Blast module models its max casts as buff applications plus extra stacks from an Avatar cast, which feeds an efficiency display but sets no target. Valued by buff stacks that expired or were overwritten × the player's own Thunder Blast average damage. Separating: stacks left at the end of a pull vs top players. Unmeasured; the buff is in the app's self-applied stream. |
| warrior-fury/MissedRampage/not-enraged-with-rampage-ready | candidate | — | Rampage | a builder cast at 80+ Rage with no Enrage | Counted (above 0 / 10 / 20, never rendered). The 80 Rage ignores the Recklessness cost cut used elsewhere. Folded with the Rampage-to-Enrage row above: build once. |
| warrior-fury/MissedRampage/overcap-anger-management, overcap-reckless-abandon | superseded | `primaryResourceCapFindings` | Anger Management; Reckless Abandon | see the overcap row above | Anger Management takes precedence when both are taken. Brutal Finish excuses a Raging Blow. |
| warrior-fury/SlayerExecute/overused-execute | candidate | — | Slayer's Dominance; Sudden Death; Executioner | an Execute cast while a fresh Sudden Death proc isn't near expiry (under 3s of 12s, or two stacks) and Executioner is under two stacks, with Raging Blow ready or Rampage affordable | Valued as the builder displaced (Raging Blow or Rampage) less the Execute. Low value: top Slayers likely dump Execute whenever it's usable in execute range, and the listener only registers the base Execute, not the Massacre variant (inference, not tested). Fails the "same as top" test if they press it freely. |
| warrior-fury/Bloodbath/bloodbath-unenraged | candidate | — | Reckless Abandon | Bloodbath cast with no Enrage | The two lists cast Bloodbath in Recklessness regardless of Enrage, so WoWAnalyzer disagrees with itself; likely a small case that the Rampage-to-Enrage row already covers. Low. |
| warrior-fury/CrushingBlow/crushing-blow-unenraged | candidate | — | Reckless Abandon | Crushing Blow cast with no Enrage | As the Bloodbath row; same contradiction with the list. Low. |
| warrior-fury/Whirlwind/stacks-wasted-on-refresh | candidate | — | Storm Surge (exemption) | Whirlwind or Thunder Clap cast with Whirlwind stacks still up | Share of casts that refresh early (above 5 / 20 / 30%), never rendered; zero casts divides 0 by 0. Really a cleave check. Valued by wasted stacks × the stack's bonus on the next builders, read from the player's hits. Low on single-target boss fights. |
| warrior-shared/Executioner/bladestorm-while-not-enraged | candidate | — | Bladestorm; Enrage | a Bladestorm cast with no Enrage on the player | Binary, annotation only. Valued as Bladestorm's damage forgone by the missing Enrage bonus; separating: top players presumably cast it with Enrage up as often as they can, and when a cooldown wait is longer than the Enrage gap the delay costs more than the bonus. Low-moderate; combine with the Bladestorm efficiency row. |
| warrior-fury/Enrage/uptime | wrong | — | Rampage or Bloodthirst; Frenzied Enrage | Enrage under 70% of the fight | A getter with no consumer (the statistic box shows the percent only). Whole-fight denominator: Enrage drops while the boss is untargetable and the full duration is the divisor. Frenzied Enrage's haste is built into the haste model. |
| warrior-fury/RageDetails/rage-wasted-reckless-abandon | covered | `primaryResourceCapFindings` | Reckless Abandon (band 25 / 30 / 35% vs 8 / 15 / 25%) | Rage wasted | Not rendered (the shared statistic shows only the wasted percent). The second getter named "efficiency" compares the wasted share to 75 / 70 / 65%, which reads inverted. Auto-attack Rage and the Cold Steel, Hot Blood bonus are reconstructed, not logged. The app reads the max from the log. |
| warrior-fury/Abilities/recklessness-efficiency | covered | `checkCooldownDrift` (Recklessness 41s) + `burstGcdFindings` | Anger Management; Recklessness | Recklessness held | 95% target, declared 90s, whole fight. WoWAnalyzer counts forced time as ready. The app tracks the shortest observed recast (41.5s measured, median 49.3s), which Anger Management's cut explains: 1s off for every 20 Rage spent. A fixed 41s errs lenient (a faster recharge would be hidden, not invented). A candidate refinement is below. Unverified (two players). |
| warrior-fury/Abilities/odyns-fury-efficiency | covered | `checkCooldownDrift` (Odyn's Fury 45s) | Midnight season 1 four-piece (2.5s off per Rampage, commented as misplaced) | Odyn's Fury held | 95% target, declared 45s, which matches the 45.0s shortest interval measured (median 47.8s). The season reduction is not applied by the app; the fixed value is lenient. |
| warrior-fury/Abilities/avatar-efficiency | candidate | — | Anger Management; Avatar | Avatar held | 95% target, declared 90s, 1s off per 20 Rage spent (shared with Recklessness). Not tracked: Arms' Avatar was left out for the same spread, and shared.ts `spentCooldownDrift` already models exactly this for Arms (90s less 1s per 20 Rage spent; Rage is resource type 1, scaled ×10; opener offset 3s; window from the Avatar buff). A Fury entry would copy that call. Valued by the Avatar window bonus from the player's hits × average window length. Measurement still needed: does the Arms rule hold for Fury? Best candidate in this ledger. |
| warrior-fury/Abilities/bladestorm-efficiency | candidate | — | Bladestorm; Executioner | Bladestorm held | 95% target, declared 90s. The Executioner module cuts 5s per stack on Execute casts made under Sudden Death, which depends on the stack count at each cast: not a fixed reduction per buff event (`spentCooldownDrift`'s `reduceOn` takes a fixed amount), so a single call can't model it directly. Arms' file records Bladestorm resets as unjudged. Likely not worth building before the tracker is checked. |
| warrior-fury/Abilities/champions-spear-efficiency | candidate | — | Champion's Spear | Champion's Spear held | 95% target, declared 90s, no reductions declared. Not in tracked-cooldowns.ts, no survey measurement recorded. Valued from the player's own Spear hits and Recklessness proximity. Low until the survey shows its interval. |
| warrior-fury/Abilities/defensives (Enraged Regeneration, Rallying Cry, Storm Bolt, Spell Reflection, Impending Victory, Berserker Rage and the other spellbook utility) | no-damage | — | Honed Reflexes; Fearless | — | Targets of 60% or less or none; the cooldown bars exist but are not graded for these. Defensives and utility aren't judged. |
| warrior-fury/statistics | no-damage | — | — | — | Display only: Enrage uptime and damage while enraged, Recklessness uptime and extra Rage, Anger Management Rage spent and cooldown cut, Hack and Slash savings, Sudden Death used over gained, Warpaint mitigation (assumes a flat 10%), the cooldown graph, rage wasted percent and Rage usage tab, Champion's Spear damage, Impending Victory healing, Spell Reflection mitigation. |

Not rules (models the rules above rest on): the Rage tracker and its
normalizers (an invented Rage event for each melee swing, attribution of
War Machine, Reckless Abandon and Recklessness bonuses, the Cold Steel, Hot
Blood extra from Recklessness, the 100 Rage cap that can't see Overwhelming
Rage), the pre-pull and event-link normalizers (Enrage refresh merging,
Enrage before Bloodthirst, Brutal Finish moved to the Bladestorm end,
Whirlwind buff order, the Sudden Death duplicate-refresh removal, free
Bloodthirst casts coinciding with Ravager or Bladestorm ticks), the Thunder
Blast cast-count model, the haste model (Frenzy, Violent Euphoria, Wild
Strikes, Enrage with Frenzied Enrage), and the cooldown-reduction models
(Anger Management, Hack and Slash cancelling Raging Blow, Burst of Power
resetting Bloodthirst and Bloodbath, Avatar of the Storm resetting Thunder
Clap and Thunder Blast, Improved Raging Blow's unlogged self-reset, Sudden
Death on Execute, Executioner on Bladestorm, Massacre on Execute, Honed
Reflexes, Fearless). The unlogged resets mean the log cannot rebuild some
ready times; that part is unverifiable, not a rule. Two Thane-list rules name
Crushing Blow where the description says Raging Blow: a possible bug whose
effect on matching I did not check.

## Candidates left

Ordered by expected value. All are unmeasured; most will fail phase 3.

- **avatar-efficiency**: most likely to survive, since the Arms recharge
  rule is already built and measured on three Arms players. First check
  whether Fury's Avatar recharges the same way.
- **recklessness-efficiency refinement**: replace the fixed 41s with the
  same Rage-spent recharge (Recklessness shares the Anger Management cut),
  so a cast delayed past its true ready time reads as drift. The existing
  check is lenient, never wrong.
- **Rampage while unenraged** (list rules plus MissedRampage): moderate;
  Enrage uptime is the damage engine of the spec.
- **Thunder Blast stacks (Thane)**: moderate; only when the hero tree is
  Thane, and only the log's Thunder Blast stacks decide.
- **Bladestorm timing and unenraged casts**: low to moderate, held back by
  the stack-dependent Executioner reduction.
- **Execute overuse (Slayer)**, **Bloodbath and Crushing Blow unenraged**,
  **Whirlwind stacks**, **Champion's Spear efficiency**: low.

An honest note: no check above has been run against a Fury page or log.
With only two Fury players in the survey and none in a case study, phase 3
will have to find reference parses first.
