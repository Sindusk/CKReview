# WoWAnalyzer audit: Feral Druid

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Druid shared layer,
  then the spec), spot-checked at their source lines (5 of
  5 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares 12.1.0, marked partially maintained (one contributor);
  last change 2026-10-10 (Midnight season 2 tier statistic, Berserk windows
  counting the 4pc duration, 12.1 talent tuning of 2026-10-09). No priority
  list and no checklist: grades are per-cast guide boxes (good / ok / fail)
  and cooldown-efficiency bars. Several rules are per cast with no fight
  denominator at all.
- **App:** `lib/damage/wow/specs/melee.ts` (`"Feral Druid"`: the Berserk
  window through `burstGcdFindings`, plus `primaryResourceCapFindings`,
  which picks Energy; nothing Feral-specific beyond those two),
  `tracked-cooldowns.ts` (Tiger's Fury 30s, Feral Frenzy 30s, Convoke the
  Spirits 61s, Berserk 120s), `potion.ts`, generic checks. **No case
  study:** the spec has one sampled player, so every Feral number in the
  app is marked unverified, and melee.ts records no Feral comparison against
  WoWAnalyzer.
- **Phase 3:** not started.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Feral sets or adds.
  The class layer (Innervate, Convoke damage attribution, form tracking) is
  folded in below.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| druid-feral/AlwaysBeCasting/downtime | superseded | `checkGcdGaps` | none | idle time | The core downtime figure, unchanged and not in the guide. Whole fight, forced time included. |
| druid-feral/CastEfficiency/tigers-fury | covered | `checkCooldownDrift` (Tiger's Fury, 30s) | Predator | Tiger's Fury held | 90% target (80 / 60 for the tiers). Whole-fight denominator, forced time counted as ready. Predator resets it in a way the log doesn't show; WoWAnalyzer suppresses the error but not the real availability, so its figure runs low. The app fits the recast from the log (30.0s shortest and median, one player). |
| druid-feral/CastEfficiency/berserk-incarnation | covered | `checkCooldownDrift` (Berserk, 120s) + `burstGcdFindings` | Berserk: Heart of the Lion (-60s a rank); Incarnation | Berserk held | 90% target. The tracked 120s matches the 1-player sample (Heart of the Lion). Incarnation is a different cast and is not tracked, so a player on it gets only the window check. WoWAnalyzer's guide allows holding it for uptime, which its own percentage punishes. |
| druid-feral/CastEfficiency/convoke | covered | `checkCooldownDrift` (Convoke the Spirits, 61s) | Ashamane's Guidance (120 to 60s) | Convoke held | 90% target. Whole-fight, forced time counted as ready. The 61s is one player's shortest interval; a 120s build would read as drift-free but lenient. |
| druid-feral/CastEfficiency/feral-frantic-frenzy | covered | `checkCooldownDrift` (Feral Frenzy, 30s) | Focused Frenzy (45 to 30s); Frantic Frenzy (fixed 45s) | Frenzy held | 90% target. The app tracks Feral Frenzy only; Frantic Frenzy (the upgrade) is not. Frantic Frenzy wants a pack, so use-on-cooldown overstates the demand on a single-target boss. |
| druid-feral/CastEfficiency/chomp | wrong | — | Chomp | Chomp cast less than 80% of 20s slots | 80 / 65 / 50% target, flagged provisional in the code. The cooldown isn't the limit (usable only under 30% energy), so the percentage overstates misses. Not drawn in the guide either. Not tracked in the app (energy-gated). |
| druid-feral/FerociousBite/cps | candidate | — | Apex Predator's Craving (free bites excluded); Convoke excluded | a Bite below 5 combo points | A fail with no ok tier. Combo points are logged on spenders only, so the count at the cast is readable. Value: the damage a Bite at 5 would do per point, less the points not spent; a last bite on a dying target is the main false positive. Cheap; what separates a mistake from play is the Rip-timing and kill-window context. |
| druid-feral/FerociousBite/energy | candidate | — | Incarnation (energy discount) | a 5-point Bite cast well below the full extra energy | Fails below roughly 49 energy. Energy is logged on the cast, so the check can be built. The Bite scales with the extra energy drained, which gives the value. WoWAnalyzer has two different Incarnation multipliers in different places (0.75 and 0.8) and the guide says 40, so the threshold under Incarnation is unsettled. Waiting to full energy can cost a Rip or Rake clip. |
| druid-feral/FerociousBite/rip-time-left | candidate | — | none | a Bite while Rip is missing or under 5s left | Ok tier, not fail; exempt when the target dies within 5s. Assumes Rip belongs on every target a Bite hits, which is wrong on short-lived adds. Remaining Rip time is modelled from cast combo points, not read from the log (the app would read the debuff). Low value; build only after the Rip uptime row. |
| druid-feral/RipUptime/low-cp-refresh | candidate | — | Berserk, Incarnation (bar raised to 5) | a Rip refresh at 3 or fewer points (4 or fewer inside Berserk) | A fresh Rip at low points is exempt; Primal Wrath's Rip is not graded. The guide text says 5 always while the code allows 4, so the floor is unsettled and should be measured from top logs. Value: Rip damage per point less the extra point it would have had. |
| druid-feral/RipUptime/early-refresh | candidate | — | Veinripper, Circle of Life and Death (durations) | Rip refreshed with more than 30% left | More than 2s of lost duration is a fail, any loss ok. This is core's pandemic rule at Rip's duration. Remaining time is modelled from cast points; the app would read the debuff window from `bossDebuffs`. Value by duration lost, not share of casts (core.md). No Tiger's Fury snapshot excuse on Rip. |
| druid-feral/RakeUptime/snapshot-downgrade | candidate | — | Carnivorous Instinct; Pouncing Strikes; Sudden Ambush | refreshing a Tiger's Fury or stealth Rake with a weaker one with over 2s left | The buffs at the apply time are in the log. Value: the damage ratio between the snapshots over the remaining time. Rake from Double-Clawed Rake or Convoke is not graded. |
| druid-feral/RakeUptime/early-refresh | candidate | — | Veinripper, Circle of Life and Death | Rake refreshed with over about 30% plus 2s left | A refresh that upgrades the snapshot is only ok. Value by duration lost; cleave play on several targets is judged per cast with no context. |
| druid-feral/MoonfireUptime/clip-or-downgrade | candidate | — | Lunar Inspiration; Circle of Life and Death | Moonfire refreshed inside the window | Stricter than Rake with no stated reason: any clip fails, no 2s buffer. Only exists with Lunar Inspiration. Fold into the Rake row if built. |
| druid-feral/FinisherUse/low-cp-finishers | superseded | — | Berserk, Incarnation | finishers below the floor | The same low-point rule applied to every finisher; the Bite and Rip rows above carry it (fresh Rip and Primal Wrath are exempt). Floor of 4 vs the text's 5 is unsettled. |
| druid-feral/BuilderUse/wasted-builder | candidate | `spenderSnapshotWaste` (shared.ts) does a related thing | none | a builder cast at 5 combo points | A donut, no tier. Combo points are logged on spenders only, so a builder at the cap would be rebuilt from the next spender's snapshot, as for Holy Power. Costs a GCD and energy; Primal Fury waste is treated as unavoidable. Low value. |
| druid-feral/SuddenAmbush/expired-proc | covered | `checkProcs` (expiries) | Sudden Ambush | a proc expiring unused | Any expiry is a fail; overwrites are a statistic only. Whether `checkProcs` picks up Sudden Ambush on a Feral pull is phase 3 (one sampled player). |
| druid-feral/SuddenAmbush/rake-consumption | wrong | — | Sudden Ambush | the proc spent on Rake | Rake is a fail, Shred or Swipe good, because the proc now boosts only Rake's first hit. Single-target priority: a fresh Rake on a new target can be worth more than a Shred. Also a balance fact that has to be rechecked each patch. |
| druid-feral/Berserk/active-time-in-window | covered | `burstGcdFindings` (Berserk) + `checkGcdGaps` | Berserk, Incarnation | a Berserk with idle or capped time | Good above 90% active or capped under 10%; fail below 70% active and over 30% capped. Forced time inside the window is not subtracted. Idle inside the window costs more than a normal GCD, and the app already prices that premium: `burstGcdFindings` values the missing GCDs at the window's bonus. |
| druid-feral/Berserk/convoke-pairing | candidate | — | Convoke, Berserk: Heart of the Lion | a Berserk with no Convoke inside it | Only when both share one cooldown; the whole cast fails. The app's sample player has them on different cooldowns (120s and 61s), so the rule would not apply there. Low value. |
| druid-feral/ConvokeSpiritsFeral/tf-and-berserk-active | candidate | — | Convoke; Berserk or Incarnation | Convoke without Tiger's Fury or without Berserk | Two checklist rows. The Tiger's Fury half is reasonable; the Berserk half can be impossible by design when Convoke is on 60s and Berserk on 120s. The buff test is a single instant at the cast. Value: Convoke's damage in a window vs outside, from the player's own casts. |
| druid-feral/FeralFrenzy/combo-points | candidate | — | Feral Frenzy, Frantic Frenzy | Frenzy cast at 3 or more points | Awards 5 points, so wasted points above 5; fail above 4, ok above 2. Points at the cast are in the log. Low value (a few points lost per cast). |
| druid-feral/FeralFrenzy/focused-frenzy-tf | candidate | — | Focused Frenzy | Frenzy cast outside Tiger's Fury | Conflicts with the 30s cooldown on a 30s Tiger's Fury whenever they drift; holding one to align costs the other. Phase 3 would test whether top players ever hold. |
| druid-feral/Chomp/tf-alignment | no-damage | — | Chomp | — | Cannot lose a grade (perfect or good only). |
| druid-feral/TigersFuryEnergy/waste | covered | `primaryResourceCapFindings` | none | Tiger's Fury cast near the energy cap | Dead in WoWAnalyzer: the thresholds are never read, so no player sees a grade. Tiger's Fury is a non-spending cast, which is exactly what the cap check can see at the cap. |
| druid-feral/HitCountAoE/zero-hit-casts | candidate | — | Primal Wrath | a Swipe or Primal Wrath hitting nothing, or one target | A donut with a note on zero-hit casts; one-target Swipe is shown red, which is wrong on a boss-only fight and in low-energy windows. Only the zero-hit part is a loss; it is rare. Low value. |
| druid-feral/Guide/energy-cap-time | covered | `primaryResourceCapFindings` | Tireless Energy; Savage Fury | time at the energy cap | A percentage of the whole fight with no grade, forced time included. The app flags non-spending casts at the cap. Passive regen lost at the cap is modelled by WoWAnalyzer and not in the log (unverifiable part, melee.ts). |
| druid-shared/Abilities/innervate-efficiency | no-damage | — | Innervate | — | The only class-level efficiency grade. For a damage spec it is mana, utility. |
| druid-shared/utility | no-damage | — | many | — | Cooldown declarations for Mighty Bash, Cyclone, Typhoon, roots, Barkskin, Wild Charge, Stampeding Roar, Skull Bash, Rebirth, Dash and the forms. Utility and defensives aren't judged. |
| druid-feral/statistics | no-damage | — | — | — | Display only: DoT uptimes and snapshot shares (Rip, Rake, Moonfire; no threshold), Tiger's Fury windows, energy and combo-point charts, Convoke and Feral Frenzy damage, Apex Predator's Craving and Unseen Predator statistics, Sudden Ambush utilisation, damage-added tables for Sabertooth, Saber Jaws, Taste for Blood, Merciless Claws, Blood Spattered, Rampant Ferocity, Infected Wounds, Double-Clawed Rake, Carnivorous Instinct, Hunger for Battle, Omen and Moment of Clarity, tier-set statistics, cooldown throughput. |

Not rules (models the rules above rest on): the Snapshots base class
(tracked expected DoT end, snapshot power and clipped time, with durations
and boosts from hand-kept constants; Rip, Rake and Moonfire grading rest on
it), the five normalizers that link casts to hits, DoT applications, Bite
energy drain and Soul of the Forest energise, the Energy and combo-point
trackers (including the Incarnation cost multiplier), the form tracker, and
the Convoke damage attribution and its spell-count assumptions (tables not
extracted). Berserk's window length (15s, 20s with Incarnation, plus the
4pc's 10s) is hand-kept. No cooldown reduction of the "seconds per event"
kind is modelled in Feral; Heart of the Lion, Ashamane's Guidance and
Focused Frenzy are fixed changes read once from talents.

## Candidates left

Ordered by expected value. Candidates are cheap and most fail phase 3.

1. **Rip uptime, early refresh and low-point refresh** (with the Rake and
   Moonfire early-refresh rows). The largest damage lever in the kit and
   the app has no Feral DoT check at all, even though `dotUptimeFindings`
   exists in shared.ts. The log shows the Rip debuff windows and the
   points spent. Value by duration lost and Rip damage per point. Premise
   to test: whether top players clip Rip early or refresh at 4 points as
   often as the weaker ones (Rake fails the same way); the 4 versus 5
   point floor is unsettled in the source itself.
2. **Ferocious Bite points and energy.** Cheap from the cast snapshot.
   Premise to test: whether top players Bite below 5 points or below
   full energy on adds or at the end of a pull; value the lost percentage
   of Bite damage.
3. **Rake snapshot downgrade.** The buff at apply time is in the log;
   separating a mistake from play needs the remaining time and the next
   Tiger's Fury.
4. **Convoke with Tiger's Fury** (the Berserk half is design-dependent).
   Value from the player's own Convoke damage with and without it.
5. **Frenzy points and Focused Frenzy alignment, builder at the cap, zero-hit
   Swipe.** Small per use; only if a Feral page and a log disagree with
   the cap check.

The two Feral-wide caveats: only one Feral player is sampled, so every
number above is unverified until a top Feral parse on a Venomous Abyss
boss is fetched, and the app's Energy cap check sees only non-spending
casts at the cap, so Feral's pooling is read generously.
