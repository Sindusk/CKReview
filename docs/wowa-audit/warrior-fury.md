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
- **App:** `lib/damage/wow/specs/fury.ts` since phase 3 (Rampage held while
  unenraged, Recklessness drift, Fury's own Rage cap check), wired from
  `melee.ts` (`"Fury Warrior"`: the Recklessness window through
  `burstGcdFindings`), `tracked-cooldowns.ts` (Odyn's Fury 45s),
  `procs.ts` (Sudden Death), `potion.ts`, generic checks. **No case
  study:** no Fury page against a reference has been read.
- **Phase 3:** done 2026-10-17 (Claude Opus 5.5). 18 Fury player-pulls,
  all Mythic kills; eight fights fetched for it (~210 WCL points with the
  rankings):
  - top: Naxxio (zBb3HQpZCkxAfvqn fight 8, Entombed Sentinels 100th),
    Toýmaker (ZTGbp8m9DjJtvAf3 fight 24, 99.2th), Golgatron
    (dp6am4TQhG3cKFxR fight 26, Vashnik 100th), 沐川內枯
    (19WyTrzgQRvdc4Z8 fight 5, Vashnik 99.4th), all fetched; Kratos
    (vRPGT4MN6VALQWFh, 94.0th) and Mauleon (X618LRt7hPqzbVJj, 92.8th)
    already on disk;
  - weaker, fetched: Grogrin (zQq63GHTRwPgt2Bp fight 7, Entombed
    Sentinels 6.8th), Tenebrionnu (CdMnBQWKX3gLYxym fight 53, 8.3th),
    Thimfury (NrAkz46XQFvB7dT2 fight 13, 14.4th), Celex
    (nXkTwgWmDKAvQ7qx fight 30, 16.7th);
  - on disk, unranked here: Sigmardoom (on Golgatron's kill, 116k/s),
    Абсентофф, Luxurécrase, Øuranøse, Tente, Bekon, Fulgørr, 残乁梦.

  Talents, from casts, buffs and hits: 16 of 18 are Slayer (Bladestorm
  446035 pressed 5–10 times a pull, Slayer's Strike, Executioner, Sudden
  Death); 残乁梦 and Celex are Mountain Thane (Avatar pressed with every
  Recklessness, Thunder Blast, Lightning Strike). Everyone has Reckless
  Abandon (Crushing Blow, Bloodbath); all but Celex press Odyn's Fury.
  Nobody presses Ravager or Champion's Spear. Only Rampage spends Rage (80).

  Built (fury.ts, commit 9925d7a): **Rampage held while unenraged**,
  **Recklessness drift** (72s less 1s per 40 Rage spent, valued by its
  window; replaces the tracked fixed 41s, which was worth 0 a use), and
  Fury's own **Rage cap check** (casts inside Recklessness and Bladestorm
  aren't judged). Odyn's Fury drift is now valued by its hits under all
  three ids, with burstHold (tracked-cooldowns.ts). Engine fix (game.ts,
  commit cad0106): Bladestorm's own Bloodthirsts and Bloodbaths, 3–4 a
  channel, are the channel's, not presses (22–38 of a top player's 26–38
  Bloodbaths were). Not built, with numbers below: Thunder Blast stacks
  (negligible), Whirlwind stacks overwritten (fires on the top players as
  much), Bladestorm's cooldown (no model fits). Proposed `wrong`: Slayer
  Execute overuse (an Execute out-hits the press it would displace).
  Re-run of the existing checks on the top players: the shared Rage cap
  read 0.47–1.01M on them (now 0–81k); the Recklessness window reads top
  0–79k, weak 18–252k (kept); Sudden Death expiries (procs.ts) fire on two
  top players once each (Kratos 0:51, 91k; Mauleon 2:27, 95k) and on the
  weak 61–90k a pull. Spell survey: no unlisted press precedes the top
  players' idle gaps (Heroic Leap and Healthstone only); GCD uptime top
  88–89%, bottom 74–84%.
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
| warrior-fury/AplCheck/slayer-and-thane-ordering (Slayer: Rampage in Recklessness with Bladestorm ready, Execute with Sudden Death in Recklessness, Execute, Raging Blow, Rampage, Bloodthirst; Thane: the same plus the Thane filler order) | superseded | `burstGcdFindings` (Recklessness) + `checkGcdGaps` | Slayer's Dominance; Hack and Slash; Reckless Abandon | a cast of a lower-priority spell while a higher one was ready | A first-match-wins list; a rule is "frequently skipped" at over 40% of its chances (core.md). Most rules only choose between builders of near equal weight, and the Recklessness versions are automatic upgrades of the same button (Crushing Blow for Raging Blow, Bloodbath for Bloodthirst), so the order changes little damage. Single-target: it cannot flag a missed cleave. The checker ignores pre-pull casts. The app counts the GCDs that fit and were pressed in the window, which is where most of the value is. Phase 3 (2026-10-17): Raging Blow's charges and Bloodthirst's resets aren't rebuilt, so "ready" can't be judged; the one ordering rule with a measured loss (Rampage to Enrage) is built, row below. |
| warrior-fury/AplCheck/slayer-rampage-to-enrage, thane-rampage-enrage-or-high-rage | verified | `rampageUnenraged` (fury.ts) | Rampage; Enrage | a press made with Enrage down and Rampage affordable | Phase 3 (2026-10-17), **built as Rampage held while unenraged**. Enrage is the spec's damage engine: the player's non-crit hits without it read ×1.4–1.8 against the same hits with it (melee, Whirlwind, Raging Blow; ×1.24–1.89 pooled a player, outside Recklessness). Unforced Enrage uptime: top 96–98% (Mauleon 90%), weak 87–92%. A builder, Execute, Bladestorm or Odyn's Fury pressed unenraged at 80+ Rage kept Enrage off until it came back: lost = the player's hits over that stretch × (ratio − 1); Rampage first would only have moved the builder one GCD. Excused: a press within one GCD of Enrage running out (already queued; the top players' Executes came 0.5–1s after it fell), Whirlwind / Thunder Clap with no cleave stacks (setting up a Rampage that cleaves), Bladestorm's own Bloodthirsts, forced time. Top: Naxxio none, Golgatron 22k, Kratos 27k, 沐川內枯 81k, Toýmaker 116k (ZTGbp8m9DjJtvAf3, Raging Blow at 1:47 and 3:24), Mauleon 285k. Weaker: Tenebrionnu 575k, Celex 490k (nXkTwgWmDKAvQ7qx, Raging Blow at 1:24 with 103 Rage, Enrage back 3.0s later: 390k), Абсентофф 475k, Thimfury 385k, Fulgørr 379k, Luxurécrase 317k, Tente 262k, Grogrin 173k. The Rage cap check doesn't see it (most of these presses came at 83–125 Rage). |
| warrior-fury/AplCheck/rampage-high-rage (R3 R10 R31 R32 in the extract) and MissedRampage overcap rows | superseded | `rageCapped` (fury.ts) | Anger Management (115); Reckless Abandon (120, outside Recklessness) | a builder cast at 100 to 120+ Rage | WoWAnalyzer flags builders cast well before the 100 Rage cap so the next builder won't be wasted; the app flags only Rage actually generated into a full bar. The hard-coded 100, 115 and 120 are preferences, not losses; Recklessness is excused from the 120 rule because overcapping there is accepted. Whole-fight Rage waste is the cap check's. Phase 3 (2026-10-17): the app now excuses Recklessness too, measured (RageDetails row). |
| warrior-fury/AplCheck/thane-thunder-blast (R17 R21 R24 R29) | candidate | — | Thane hero tree; Thunder Blast; Avatar of the Storm; Storm Surge | Thunder Blast stacks not turned into casts while Thunder Clap was ready | WoWAnalyzer prefers Thunder Blast at two stacks. The Thunder Blast module models its max casts as buff applications plus extra stacks from an Avatar cast, which feeds an efficiency display but sets no target. Valued by buff stacks that expired or were overwritten × the player's own Thunder Blast average damage. Phase 3 (2026-10-17), **measured, not built** (negligible). The buff (435615) logs its stacks; on the two Thane players every gain but one was spent by a Thunder Blast (残乁梦 yrFd7CYZvt6XAz3T: 40 presses, one removal with no press beside it at 1:17; Celex nXkTwgWmDKAvQ7qx: 32 presses, none). Thunder Blast does 126–200k a press against Thunder Clap's 59–72k, so one lost stack is ~0.1M. No top Thane log was found to check the premise against (all four top parses fetched are Slayer). |
| warrior-fury/MissedRampage/not-enraged-with-rampage-ready | verified | `rampageUnenraged` (fury.ts) | Rampage | a builder cast at 80+ Rage with no Enrage | Counted (above 0 / 10 / 20, never rendered). The 80 Rage ignores the Recklessness cost cut used elsewhere. Folded with the Rampage-to-Enrage row above: built once. Phase 3 (2026-10-17): Rampage logs a cost of 80 on every cast on the samples, Recklessness included, so the check reads the player's own Rampage cost. |
| warrior-fury/MissedRampage/overcap-anger-management, overcap-reckless-abandon | superseded | `rageCapped` (fury.ts) | Anger Management; Reckless Abandon | see the overcap row above | Anger Management takes precedence when both are taken. Brutal Finish excuses a Raging Blow. |
| warrior-fury/SlayerExecute/overused-execute | wrong | — | Slayer's Dominance; Sudden Death; Executioner | an Execute cast while a fresh Sudden Death proc isn't near expiry (under 3s of 12s, or two stacks) and Executioner is under two stacks, with Raging Blow ready or Rampage affordable | Valued as the builder displaced (Raging Blow or Rampage) less the Execute. Phase 3 (2026-10-17), **proposed `wrong`**: the displaced press is worth less than the Execute. Per press (hits by name, off-hands folded in): Naxxio Execute 130k vs Raging Blow 98k and Rampage 90k; Golgatron 145k vs 95k / 122k; 沐川內枯 154k vs 95k / 117k; Thimfury 92k vs 78k / 79k; 残乁梦 132k vs 85k / 138k. Pressing Execute first costs nothing, so the rule flags a gain. (The Rampage-to-Enrage part of an Execute is the row above's.) |
| warrior-fury/Bloodbath/bloodbath-unenraged | covered | `rampageUnenraged` (fury.ts) | Reckless Abandon | Bloodbath cast with no Enrage | The two lists cast Bloodbath in Recklessness regardless of Enrage, so WoWAnalyzer disagrees with itself. Phase 3 (2026-10-17): with Rampage affordable it's the Rampage row's loss; below 80 Rage no press brings Enrage back sooner, so there's nothing else to lose. Most Bloodbaths are Bladestorm's own (game.ts, cad0106), not presses. |
| warrior-fury/CrushingBlow/crushing-blow-unenraged | covered | `rampageUnenraged` (fury.ts) | Reckless Abandon | Crushing Blow cast with no Enrage | As the Bloodbath row. |
| warrior-fury/Whirlwind/stacks-wasted-on-refresh | candidate | — | Storm Surge (exemption) | Whirlwind or Thunder Clap cast with Whirlwind stacks still up | Share of casts that refresh early (above 5 / 20 / 30%), never rendered; zero casts divides 0 by 0. Really a cleave check. Phase 3 (2026-10-17), **measured, not built** (fires on the top players as much). The buff (85739) logs its stacks (4 a Whirlwind, one per spender). A trial valued each stack overwritten by a Whirlwind / Thunder Clap at the player's own cleave per stack spent (the spender's hits on enemies other than its main target): top Toýmaker 74k, Kratos 132k, Naxxio 281k, Golgatron 324k, Mauleon 645k, 沐川內枯 714k; weaker Tenebrionnu 59k, 残乁梦 255k, Grogrin 406k, Celex 412k, Fulgørr 893k. Most overwrites are at one stack and on one target, where a stack is worth nothing; the average-per-stack price overstates them. A lead outside the rule: Thimfury (NrAkz46XQFvB7dT2) pressed no Whirlwind at all on Entombed Sentinels. |
| warrior-shared/Executioner/bladestorm-while-not-enraged | covered | `rampageUnenraged` (fury.ts) | Bladestorm; Enrage | a Bladestorm cast with no Enrage on the player | Binary, annotation only. Phase 3 (2026-10-17): no top player pressed Bladestorm or Odyn's Fury unenraged; Tente (v8bmgMAdcnBCj9Ya) did 3 times and Thimfury 4 (1:08, 1:40, 4:35, 5:08), every one at 94–130 Rage, so each is priced by the Rampage row (Thimfury's three that count: 18–55k each; the channel is short, ~2.4s). |
| warrior-fury/Enrage/uptime | covered | `rampageUnenraged` (fury.ts) | Rampage or Bloodthirst; Frenzied Enrage | Enrage under 70% of the fight | A getter with no consumer (the statistic box shows the percent only). Phase 3 re-check (2026-10-17), **the premise holds, the threshold doesn't**: Enrage is worth ×1.24–1.89 a hit, so uptime matters, but whole-fight uptime is under 70% only on players who died (Grogrin 55%, Tenebrionnu 54%, Sigmardoom 52%); outside forced time it's top 96–98%, weak 87–92%. The avoidable part, Enrage down with Rampage affordable, is priced by the Rampage row; Enrage down without the Rage is idle or Rage starvation, which the gap check sees. |
| warrior-fury/RageDetails/rage-wasted-reckless-abandon | covered | `rageCapped` (fury.ts) | Reckless Abandon (band 25 / 30 / 35% vs 8 / 15 / 25%) | Rage wasted | Not rendered (the shared statistic shows only the wasted percent). The second getter named "efficiency" compares the wasted share to 75 / 70 / 65%, which reads inverted. Auto-attack Rage and the Cold Steel, Hot Blood bonus are reconstructed, not logged. The app reads the max from the log. Phase 3 (2026-10-17): **the shared cap check read the top players as weak** (Naxxio 1.01M, 沐川內枯 991k, Golgatron 816k; weak 0.08–2.18M), mostly Bloodbath at full Rage. Two causes, both measured: Bladestorm's own Bloodthirsts / Bloodbaths (not presses; game.ts now reads them as the channel's), and Recklessness, where Crushing Blow (175–225k) and Bloodbath (183–238k) out-hit a Rampage (90–122k) about 2× and Rage comes ~30 a press against ~18: the top players cap on 15–34% of their presses inside it, 1–12% outside. Fury's own check judges only casts outside both (and skips Odyn's Fury's extra cast ids): top 0–81k, weak 19–294k (残乁梦 294k, Thimfury 262k). |
| warrior-fury/Abilities/recklessness-efficiency | covered | `recklessnessDrift` (fury.ts, `spentCooldownDrift`) + `burstGcdFindings` | Anger Management; Recklessness | Recklessness held | 95% target, declared 90s, whole fight. WoWAnalyzer counts forced time as ready. Phase 3 (2026-10-17), **rebuilt**: the tracked fixed 41s sat above the 36.9s shortest interval (Kratos), and a use was worth 0 (Recklessness does no damage itself), so its drift never reported. Over 117 intervals, elapsed + Rage spent ÷ R is tightest at R = 35–42; at 40 the top players' quick recasts sit at 74.5–77 and the lowest at 72.7, so 72s less 1s per 40 Rage spent (the most lenient fit; no cast comes before it). WoWAnalyzer's 90s less 1s per 20 doesn't fit (its floor would be 96.5, and the clusters spread 3× wider). A use is worth the player's rate inside the 24.0s windows less outside (forced time out, Odyn's Fury and Bladestorm left out): ×1.5–1.8 on the top players, 1.7–4.0M a use. Vashnik's Imbibe holds excused. Fires on none of the 18 player-pulls: the long waits (Mauleon 70–85s, Tente 63–67s, Thimfury 55–71s) are Stasis, Imbibe holds, or less than a whole recharge. |
| warrior-fury/Abilities/odyns-fury-efficiency | covered | `checkCooldownDrift` (Odyn's Fury 45s) | Midnight season 1 four-piece (2.5s off per Rampage, commented as misplaced) | Odyn's Fury held | 95% target, declared 45s. Phase 3 (2026-10-17): **a clean 45s** (shortest 45.0–46.8s on the players who press it on cooldown: Абсентофф 45.0, Toýmaker 45.5, Øuranøse 45.8, Naxxio 45.9; never shorter, so the four-piece cut isn't in these logs). A press logs four casts (385059, then 385060 / 385061 / 385062 within 0.3s); a use was valued at the hits under 385062 alone, now under all three (0.2–0.4M a press) less the GCD in its place. burstHold: the top Vashnik players press it with Recklessness after each Imbibe, 77–85s apart. Fires on: top none; Mauleon 103k (X618LRt7hPqzbVJj, 2:35), Tente 133k, Tenebrionnu 338k (two uses). |
| warrior-fury/Abilities/avatar-efficiency | covered | `recklessnessDrift` (fury.ts) | Anger Management; Avatar | Avatar held | 95% target, declared 90s, 1s off per 20 Rage spent (shared with Recklessness). Phase 3 (2026-10-17): **only the Thane players take Avatar, and both press it at the same instant as every Recklessness** (残乁梦 7 of 7, Celex 7 of 7; the Slayers cast none). Its drift is Recklessness's. |
| warrior-fury/Abilities/bladestorm-efficiency | unverifiable | — | Bladestorm; Executioner | Bladestorm held | 95% target, declared 90s. The Executioner module cuts 5s per stack on Execute casts made under Sudden Death. Phase 3 (2026-10-17), **the cooldown can't be rebuilt from the log**, as on Arms: intervals run 16.7–85s (Golgatron 0:39 → 0:56), and the press rate doesn't separate players (top 1.04–1.78 a minute, weak 1.19–1.39). The top Slayers press it with Recklessness and again between. Its unenraged presses are the Rampage row's. |
| warrior-fury/Abilities/champions-spear-efficiency | candidate | — | Champion's Spear | Champion's Spear held | 95% target, declared 90s, no reductions declared. Phase 3 (2026-10-17): nothing to measure, none of the 18 player-pulls presses it. |
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
effect on matching I did not check. Phase 3: the free Bloodthirst
normalizer has a counterpart in the app now (game.ts, Bladestorm's own
Bloodthirsts and Bloodbaths), and Sudden Death expiries are procs.ts's.

## Candidates left

Phase 3 (2026-10-17) worked this list in order; the rows hold the
numbers.

- **avatar-efficiency**: `covered` (only Thane takes Avatar, pressed with
  every Recklessness).
- **recklessness-efficiency refinement**: built (`recklessnessDrift`).
- **Rampage while unenraged**: built (`rampageUnenraged`).
- **Thunder Blast stacks (Thane)**: negligible on the two Thane logs; no
  top Thane log found.
- **Bladestorm timing and unenraged casts**: the cooldown can't be
  rebuilt (`unverifiable`); unenraged presses are covered.
- **Execute overuse (Slayer)**: proposed `wrong`. **Bloodbath and Crushing
  Blow unenraged**: covered. **Whirlwind stacks**: fires on the top
  players as much, not built. **Champion's Spear**: nobody presses it.

Held for the user's review: the proposed `wrong` Execute overuse row.
