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
  window through `burstGcdFindings`, `primaryResourceCapFindings` on
  Energy, and since phase 3 `specs/feral.ts`), `tracked-cooldowns.ts`
  (Tiger's Fury 30s, Feral Frenzy 30s, Convoke the Spirits 120s, Berserk
  120s, Incarnation 91s, each valued per use since phase 3), `procs.ts`
  (Clearcasting, Apex Predator's Craving), `potion.ts`, generic checks.
  **No case study.**
- **Phase 3 (2026-10-17):** done. Measured on 14 Feral player-pulls of 13
  players, all Mythic kills fetched for it: the top Catalyà and Orog
  (X618LRt7hPqzbVJj, Vashnik 100th), 万花通灵 (yrFd7CYZvt6XAz3T, 99.3rd),
  Vydal (fh6bLKy12gzWvGCH, 98.6th), Scaricat (6Bpq1FmA9aH4WQxc, Entombed
  Sentinels 100th), Samarae (QFTXqD8VNKCvx9jf, 99.5th), 小奶酱丶
  (RbhPKYWd6t1nAC3f, 94th, plus the survey's Vashnik pull); the weak
  Cheezywizzy (ZvrLTQfk1zbAXMwB, Vashnik 3rd and Entombed Sentinels 20th),
  Chesteria (C4Kxpn3FtrvjWMAP, 3rd), Lylyvienne (KB1a9CWc6pT4VGqA, 16th),
  Munchkinz (nhbCYHXRf1T2qAv9, 16th), Tyger (RwxWC6PF2pJ7Zd9H, 18th).
  Talents: Wildstalker on all but Lylyvienne (Druid of the Claw, Ravage),
  Circle of Life and Death on all (bleeds 0.8× as long: Rip 19.2s at 5
  points, Rake 12.0s, Moonfire 14.4s, 30% carry-over); no Bloodtalons,
  Thrash, Brutal Slash or Chomp anywhere. Two builds: Berserk with Convoke
  on one 120s cooldown and Apex Predator's Craving, or Incarnation (91s)
  without Convoke (Vydal, 小奶酱丶 on Vashnik, Lylyvienne). Lunar
  Inspiration on the Entombed Sentinels kills only. Built (feral.ts's
  header has the models and numbers): "Rip off every enemy" and
  "Ferocious Bite below 5 points" (1f4d23a), the window check on
  Incarnation (Incarnation players had none); the tracked cooldowns' value
  per use, Convoke at 120s and Incarnation tracked (b047707; all five were
  worth 0, so no drift had ever shown); Clearcasting and Apex Predator's
  Craving expiries (0d91fd6, procs.ts); Lunar Inspiration's Moonfire,
  Frantic Frenzy and Stampeding Roar as GCD presses (e966eb2, game.ts:
  every Moonfire read as idle, Scaricat's gaps and delays 6.74M → 2.76M).
  Re-run on the top players: Feral Frenzy drift reads 600k on Catalyà
  (100th; presses 35–41s apart, two uses lost) against 299–736k on four
  weaker pulls, kept as a real loss; the Berserk window (top 0.04–0.52M,
  weak 0.02–0.29M) and Energy at the cap (top 0.05–0.82M, weak
  0.35–1.07M) fire on the top players about as much and are kept, numbers
  in the rows. Proposed `wrong`: Rip refreshed early, Tiger's Fury Energy
  waste.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Feral sets or adds.
  The class layer (Innervate, Convoke damage attribution, form tracking) is
  folded in below.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| druid-feral/AlwaysBeCasting/downtime | superseded | `checkGcdGaps` | none | idle time | The core downtime figure, unchanged and not in the guide. Whole fight, forced time included. Phase 3 (2026-10-17): Lunar Inspiration's Moonfire (155625) wasn't in the spell survey, so each press read as idle (~30 a pull on the four Entombed Sentinels players who take it); game.ts marks it, Frantic Frenzy and Feral's Stampeding Roar on-GCD (e966eb2). Median GCD uptime 76% → 83%; the top players 83–87%, the Energy floor (dps-analysis.md). |
| druid-feral/CastEfficiency/tigers-fury | verified | `checkCooldownDrift` (Tiger's Fury, 30s, `valuePerUse`) | Predator | Tiger's Fury held | 90% target (80 / 60 for the tiers). Whole-fight denominator, forced time counted as ready. Predator resets it in a way the log doesn't show; WoWAnalyzer suppresses the error but not the real availability, so its figure runs low. Phase 3 (2026-10-17): shortest interval 30.0s, median 30.8s on 14 player-pulls. A use was worth 0 (TF deals nothing), so its drift never showed; now valued by its window (`feralWindowValue`, feral.ts): +12–27% on the player's direct hits, 0.40–0.97M a use. Fires on Cheezywizzy's Vashnik kill only (ZvrLTQfk1zbAXMwB, 397k, 26s held, one use at 4:55); no top player. |
| druid-feral/CastEfficiency/berserk-incarnation | verified | `checkCooldownDrift` (Berserk 120s, Incarnation 91s, `valuePerUse`) + `burstGcdFindings` | Berserk: Heart of the Lion (-60s a rank); Incarnation | Berserk held | 90% target. WoWAnalyzer's guide allows holding it for uptime, which its own percentage punishes. Phase 3 (2026-10-17): Berserk 120.5 / 124.2s (shortest / median), Incarnation 91.1 / 92.1s; both windows 25s with the tier set. A use was worth 0; now valued by its window (Berserk 1.08–2.49M, Incarnation 1.64–1.94M). Incarnation is tracked now (three of 13 players play it). No whole use lost on anyone (Scaricat held Berserk and Convoke 35s once on Entombed Sentinels). |
| druid-feral/CastEfficiency/convoke | verified | `checkCooldownDrift` (Convoke the Spirits, 120s, `valuePerUse`) | Ashamane's Guidance (120 to 60s) | Convoke held | 90% target. Whole-fight, forced time counted as ready. Phase 3 (2026-10-17): every Convoke player presses it ~2s after Berserk, 120.0 / 125.5s apart (24 intervals); the survey's 61s was one player on another build, so the tracked 61s would have flagged everyone once valued. Its hits log under the spells it casts, so a use was worth 0; now its channel's direct hits less the player's direct-hit rate outside it (`convokeValue`, 0.67–1.39M). No whole use lost on anyone. |
| druid-feral/CastEfficiency/feral-frantic-frenzy | verified | `checkCooldownDrift` (Feral Frenzy, 30s, `valuePerUse`) | Focused Frenzy (45 to 30s); Frantic Frenzy (fixed 45s) | Frenzy held | 90% target. Frantic Frenzy (the upgrade) is not tracked. Phase 3 (2026-10-17): 30.0 / 32.4s on the 11 players who press it; Lylyvienne plays Frantic Frenzy (6 presses), Chesteria neither. Its hits log as 274838, so a use was worth 0; now its own presses' hits in 6s less a GCD (`feralFrenzyValue`, 155–529k; Convoke's Frenzies share the hit id, so a player who never presses it isn't judged). Fires on Catalyà (X618LRt7hPqzbVJj, 100th) 600k: 11 presses 35–41s apart, 61.6s held, two uses; weaker Cheezywizzy 353k / 736k (presses 41–71s apart), Tyger 664k, Munchkinz 299k; the other top players none. Kept: a real loss on one top player as on the weak. |
| druid-feral/CastEfficiency/chomp | wrong | — | Chomp | Chomp cast less than 80% of 20s slots | 80 / 65 / 50% target, flagged provisional in the code. The cooldown isn't the limit (usable only under 30% energy), so the percentage overstates misses. Not drawn in the guide either. Phase 3 re-check (2026-10-17), **stays `wrong`**: nobody presses Chomp in 14 player-pulls (no cast, no hit), so there is nothing to test. |
| druid-feral/FerociousBite/cps | verified | "Ferocious Bite below 5 points" (specs/feral.ts) | Apex Predator's Craving (free bites excluded); Convoke excluded | a Bite below 5 combo points | A fail with no ok tier. Phase 3 (2026-10-17), **built**: paid Bites only (no Apex Predator's Craving removal at the press, an Energy cost logged), a target dying within 5s and the pull's last 10s excluded. The damage is linear in the points, so the loss is the press's 25 Energy spread over fewer points: (5 − points) ÷ 5 × 25 Energy as Shred. Top 0–37k (Vydal fh6bLKy12gzWvGCH three 4-point Bites, two on a Shrouded Venom at 3:14), Orog, Scaricat, Samarae none; weaker Cheezywizzy 332k on Vashnik (11, 1-point Bites on the boss at 1:10, 1:41, 2:46 with 79–100 Energy), Chesteria C4Kxpn3FtrvjWMAP 286k (15, 3:17 one point with 111 Energy), Tyger 84k. |
| druid-feral/FerociousBite/energy | candidate | — | Incarnation (energy discount) | a 5-point Bite cast well below the full extra energy | Fails below roughly 49 energy. Phase 3 (2026-10-17), **not built, unsettled**: paid Bites under 50 Energy are 0–5 a pull on the top players (Catalyà 5), 0–6 on the weak (Chesteria 6). The extra drain isn't logged (the cost reads 25), but 5-point Bites at 50+ Energy hit ~86k against ~43–70k below it, so the extra Energy buys ~1.7k a point, against 1.4–2.7k as Shred depending on what a combo point is worth. Whether pooling for the Bite gains anything isn't settled by the log. |
| druid-feral/FerociousBite/rip-time-left | superseded | "Rip off every enemy" (specs/feral.ts) | none | a Bite while Rip is missing or under 5s left | Ok tier, not fail; exempt when the target dies within 5s. Phase 3 (2026-10-17): a Bite in place of a Rip costs the time Rip is off, which the new gap check prices (Rip's rate less the Rip press's points as Bite and Energy as Shred). |
| druid-feral/RipUptime/low-cp-refresh | candidate | — | Berserk, Incarnation (bar raised to 5) | a Rip refresh at 3 or fewer points (4 or fewer inside Berserk) | A fresh Rip at low points is exempt; Primal Wrath's Rip is not graded. Phase 3 (2026-10-17), **not built, negligible**: 0–4 a pull on the top players (小奶酱丶), 0–6 on the weak (Cheezywizzy); each loses the unused fraction of a 20-Energy press, under 20k. |
| druid-feral/RipUptime/early-refresh | wrong | — | Veinripper, Circle of Life and Death (durations) | Rip refreshed with more than 30% left | More than 2s of lost duration is a fail, any loss ok. Phase 3 (2026-10-17), **proposed `wrong`**: Rip durations from the log (0.8 × 4s × (points + 1) with Circle of Life and Death, 30% carry-over; every untouched Rip ended within 50ms of it). Valued like Rupture (assassination.ts: the excess ÷ the duration × the points as Bite and Energy as Shred), it fires on the top players as much as on the weak: Vydal (fh6bLKy12gzWvGCH, 98.6th) 13 clips, 89s overwritten, 1.25M; 小奶酱丶 0.75 / 1.06M; Catalyà 509k; Scaricat 305k; Samarae 41k; weaker 0.14–1.02M (Cheezywizzy Vashnik 1.02M, Tyger 475k). Not snapshot play for most (Tiger's Fury over a Rip without it: Vydal 12 of the 89s) and the ticks don't grow after a clip (median ×0.94 over 42). Why the top players clip isn't found. |
| druid-feral/RakeUptime/snapshot-downgrade | candidate | — | Carnivorous Instinct; Pouncing Strikes; Sudden Ambush | refreshing a Tiger's Fury or stealth Rake with a weaker one with over 2s left | Phase 3 (2026-10-17), **not built, negligible**: Tiger's Fury snapshots on Rake (ticks after the window ×1.21, 14 players), Sudden Ambush doesn't (×1.05; it boosts the first hit). A Rake without TF over one with it, past the carry-over: top 0–8s a pull, weak 0–20s, at ~7k a second. |
| druid-feral/RakeUptime/early-refresh | candidate | — | Veinripper, Circle of Life and Death | Rake refreshed with over about 30% plus 2s left | A refresh that upgrades the snapshot is only ok. Phase 3 (2026-10-17), **not built, small**: Rake 12.0s with Circle of Life and Death. Excess past the carry-over at the same snapshot: top 0–45s a pull (median ~13s; 小奶酱丶 45s, 万花通灵 39s), weak 6–112s (median ~48s; Cheezywizzy 112s, Lylyvienne 84s), at ~7k a second (35 Energy as Shred over 12s): top ~0.1M, weak ~0.3M, at most ~0.8M. Rake uptime itself (the gap model) read 0.22–1.50M on three top players (Vydal 88.6s off), so Rake isn't judged. |
| druid-feral/MoonfireUptime/clip-or-downgrade | candidate | — | Lunar Inspiration; Circle of Life and Death | Moonfire refreshed inside the window | Stricter than Rake with no stated reason. Phase 3 (2026-10-17), **not built**: Moonfire 14.4s, snapshots Tiger's Fury (×1.25). Excess past the carry-over: top 0–26s a pull (小奶酱丶 Entombed Sentinels), weak 31–52s (Cheezywizzy, Munchkinz, Tyger), at a few k a second. |
| druid-feral/FinisherUse/low-cp-finishers | superseded | "Ferocious Bite below 5 points" | Berserk, Incarnation | finishers below the floor | The same low-point rule applied to every finisher; the Bite and Rip rows above carry it. |
| druid-feral/BuilderUse/wasted-builder | candidate | `spenderSnapshotWaste` (shared.ts) does a related thing | none | a builder cast at 5 combo points | A donut, no tier. Phase 3 (2026-10-17), **not measured**: combo points log on finishers only (builders and Feral Frenzy carry none), so the cap needs a rebuild from the finishers; Assassination's same rebuild was noisy and fired on its top players as much. Low value. |
| druid-feral/SuddenAmbush/expired-proc | unverifiable | — | Sudden Ambush | a proc expiring unused | Phase 3 (2026-10-17): not in procs.ts, so `checkProcs` never saw it. No duration fits: the longest gain → removal spans are 5.0–7.3s (one 13.6s) in 429, and the 43 removals with no press beside them come 0.2–3.4s after the gain. |
| druid-feral/SuddenAmbush/rake-consumption | wrong | — | Sudden Ambush | the proc spent on Rake | Rake is a fail, Shred or Swipe good. Phase 3 re-check (2026-10-17), **stays `wrong`**: the premise holds (a Sudden Ambush hit is always a crit; it adds ~20–24k to a Shred, ~5–7k to Rake's first hit, nothing to its ticks), but the top players spend it on Rake 0–12 times a pull (Samarae 12, Catalyà 8), the weak 5–10: ~25k each, under 0.3M on anyone. |
| druid-feral/Berserk/active-time-in-window | covered | `burstGcdFindings` (Berserk) + `checkGcdGaps` | Berserk, Incarnation | a Berserk with idle or capped time | Idle inside the window costs more than a normal GCD, and the app already prices that premium. Phase 3 (2026-10-17): top 0.04–0.52M a pull (Scaricat 6Bpq1FmA9aH4WQxc 4:42, 3 GCDs short, 307k), weak 0.02–0.29M. Fires on the top players about as much; kept, since it prices only the window's bonus on idle the gap check also counts. Incarnation players had no window check (melee.ts keys it to Berserk's buff); feral.ts adds one on Incarnation's buff: Vydal 15k, 小奶酱丶 56k, Lylyvienne 44k. |
| druid-feral/Berserk/convoke-pairing | candidate | — | Convoke, Berserk: Heart of the Lion | a Berserk with no Convoke inside it | Phase 3 (2026-10-17), **not built**: fires on nothing; all 24 Convokes sit inside Berserk, pressed ~2s after it. |
| druid-feral/ConvokeSpiritsFeral/tf-and-berserk-active | candidate | — | Convoke; Berserk or Incarnation | Convoke without Tiger's Fury or without Berserk | Phase 3 (2026-10-17), **not built**: the Berserk half fires on nothing (above). Outside Tiger's Fury: Catalyà (100th) 3 of 4, the others 0–1 of 3; worth about the TF bonus on a ~1M Convoke (~150k each), and it fires on the top player most. |
| druid-feral/FeralFrenzy/combo-points | unverifiable | — | Feral Frenzy, Frantic Frenzy | Frenzy cast at 3 or more points | Phase 3 (2026-10-17): Feral Frenzy's casts log no combo points (only finishers do), so the count at the press isn't in the log. |
| druid-feral/FeralFrenzy/focused-frenzy-tf | candidate | — | Focused Frenzy | Frenzy cast outside Tiger's Fury | Phase 3 (2026-10-17), **not built, small**: a Frenzy inside Tiger's Fury does ×1.3–1.6 (its bleed snapshots TF). Outside it: top 0–3 a pull (Catalyà 3, Orog 2), Cheezywizzy 6. None was pressed while TF was ready (TF came back 1.4–14.2s later), so each was a hold of that long for ~100–200k. |
| druid-feral/Chomp/tf-alignment | no-damage | — | Chomp | — | Cannot lose a grade (perfect or good only). Nobody takes Chomp. |
| druid-feral/TigersFuryEnergy/waste | wrong | — | none | Tiger's Fury cast near the energy cap | Dead in WoWAnalyzer: the thresholds are never read. Phase 3 (2026-10-17), **proposed `wrong`**: Tiger's Fury grants no Energy now; the cast after a TF shows only regen (6–19 Energy in 0.3–1.0s), so a TF at the cap wastes nothing of its own. The regen lost while sitting at the cap is the cap check's (row below). |
| druid-feral/HitCountAoE/zero-hit-casts | candidate | — | Primal Wrath | a Swipe or Primal Wrath hitting nothing, or one target | Phase 3 (2026-10-17), **not built, negligible**: no Swipe or Primal Wrath hit nothing in 14 pulls; one-enemy Swipes 0–4 a pull. |
| druid-feral/Guide/energy-cap-time | covered | `primaryResourceCapFindings` | Tireless Energy; Savage Fury | time at the energy cap | A percentage of the whole fight with no grade, forced time included. Passive regen lost at the cap is not in the log (unverifiable part). Phase 3 (2026-10-17): the cap check reads Energy and fires on the top players 0.05–0.82M (Catalyà the most: seven Tiger's Furies and two Regrowths at 120 Energy, ~87 Energy at ~9k each), weak 0.35–1.07M (Cheezywizzy). Kept: Feral is Energy-bound (GCD uptime 83–87% on the top players), so regen into a full bar is a real loss. |
| druid-shared/Abilities/innervate-efficiency | no-damage | — | Innervate | — | The only class-level efficiency grade. For a damage spec it is mana, utility. |
| druid-shared/utility | no-damage | — | many | — | Cooldown declarations for Mighty Bash, Cyclone, Typhoon, roots, Barkskin, Wild Charge, Stampeding Roar, Skull Bash, Rebirth, Dash and the forms. Utility and defensives aren't judged. |
| druid-feral/statistics | no-damage | — | — | — | Display only: DoT uptimes and snapshot shares (Rip, Rake, Moonfire; no threshold), Tiger's Fury windows, energy and combo-point charts, Convoke and Feral Frenzy damage, Apex Predator's Craving and Unseen Predator statistics, Sudden Ambush utilisation, damage-added tables for Sabertooth, Saber Jaws, Taste for Blood, Merciless Claws, Blood Spattered, Rampant Ferocity, Infected Wounds, Double-Clawed Rake, Carnivorous Instinct, Hunger for Battle, Omen and Moment of Clarity, tier-set statistics, cooldown throughput. Phase 3 (2026-10-17): two procs among them hide a damage loss and expire in procs.ts now: Clearcasting (Omen of Clarity: a free Shred; 4 expiries, all weak players) and Apex Predator's Craving (a free Bite; 3, two of them Scaricat's). |

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

All measured in phase 3 (2026-10-17); what's left is small or unsettled,
in rough value order:

1. **Rake refreshed early** (top ~0.1M, weak up to ~0.8M a pull): the only
   one that partly separates the top players from the weak.
2. **Bite energy**: unsettled whether pooling for the extra Energy gains
   anything.
3. **Convoke outside Tiger's Fury**, **Feral Frenzy outside Tiger's Fury**:
   ~100–200k a miss, the top player among the most frequent.
4. **Rake / Moonfire snapshot downgrades, low-point Rip, zero-hit Swipe,
   Berserk without Convoke, builder at the cap**: negligible, nothing, or
   not in the log.
