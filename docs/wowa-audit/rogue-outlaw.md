# WoWAnalyzer audit: Outlaw Rogue

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Rogue shared layer,
  then the spec), spot-checked at their source lines (4 of
  4 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares 12.0.7 ("lagging", one patch behind the clone's
  12.1.0), flagged partly maintained; its own description says it covers
  the single-target rotation and major mistakes only. Last changelog entry
  2026-08-08 (reactivated for 12.0.7), before that 2025-04-17. The
  changelog is per spec, so every record's patch is 12.0.7; rules for
  talents that have changed since are noted as doubtful, not made
  candidates. **Most of what the spec defines is not shown:** no module
  calls a suggestion API and the checklist is gone, so the threshold
  getters for the idle-time override, Audacity, Opportunity, Dispatch and
  Roll the Bones uptime have no reader ("dead getter" below). What a user
  sees graded is the guide: the core downtime box, the energy-at-cap
  sentence, per-cast finisher and Adrenaline Rush combo-point checks, and
  colored cooldown bars. The two priority rotations are dead code (not in
  the parser's module list), so they are listed for completeness only.
- **App:** `lib/damage/wow/specs/melee.ts` (`"Outlaw Rogue"`: Adrenaline
  Rush window, main resource at the cap), generic checks, `potion.ts`.
  Nothing for Outlaw is in `tracked-cooldowns.ts`. No case study: the
  melee.ts header counts one Outlaw player in the survey ("fewer than 3:
  unverified"), so no status below is `verified`.
- **Phase 3:** done 2026-10-17 on 17 Outlaw player-pulls, all Mythic
  kills: the top parses Nøwyouseemee and Âv (9XD63Z1tFWKmvCAG fight 39,
  Vashnik 98.8th / 91.9th), Scoreboard (LnNK1CxVJZQ9kfX3 fight 44, Vashnik
  100th), Decapre (VJgMTWKFBA7n1j3p fight 22, 97.7th), 저는싸이코입니다
  (M4vNdFBK8Yacb9mC fight 21, Entombed Sentinels 100th), 云梦默
  (6y7k1CLj3ABbmVJK fight 12, Sentinels 99th); the weaker Nicsterkins
  (cpdvJRj9g3WAThzx fights 20 and 13, Vashnik 1.2nd, Sentinels 5.2nd),
  Lobotomi (RFh1Cp4xdL6aY9qt fight 23, 3.5th), 步玎 (tdPcqXCya18rzVZK
  fight 58, 2.3rd), Soulsick (PzG3QDc4g7AKdJw8 fight 22, Sentinels 9.3rd),
  all ten fetched for this pass; and the six already on disk (Buffoutlaw,
  Loktark, Buckaneering, Ilikesneakin, Rosey, Stabbybuddy). Talents (from
  casts and buffs): every player is Trickster (Coup de Grace, Unseen
  Blade, Escalating Blade, Flawless Form) with Killing Spree, Keep It
  Rolling, Preparation and combo points to 7; Blade Rush on 7 of 17;
  nobody has an Audacity buff (0–1 Ambush a pull), Echoing Reprimand,
  Ghostly Strike or Supercharger. Roll the Bones is one buff (1214909) with
  a stage buff beside it (One of a Kind, Double Trouble, Triple Threat,
  Jackpot); Adrenaline Rush grants Loaded Dice, spent by the next roll.
  Built (lib/damage/wow/specs/outlaw.ts, whose header has the models and
  numbers): "Finisher below 6 combo points"; Opportunity's 12s expiry in
  procs.ts; Preparation a GCD press (game.ts). **Removed, for the user to
  approve or reject:** the Energy cap check for Outlaw (Energy never limits
  it; it read 0.07–1.32M on the top players, Âv the most). Restless Blades
  doesn't fit the log (below), so Adrenaline Rush, Killing Spree and Blade
  Rush stay untracked.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Outlaw sets or
  adds. Rogue shared-layer rules that Outlaw uses (wasted combo points,
  wasted generator energy, regen lost at the cap, the finisher-share grade,
  instant poison) are folded in where Outlaw reads them.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| rogue-outlaw/AlwaysBeCasting/downtime-pct | superseded | `checkGcdGaps` | none | idle time | The spec widens the grade to 20 / 25 / 30% of the fight but under a name the core module does not read, so the live grade is the core 5 / 10 / 15%. Whole-fight denominator, forced time counted as idle (core.md). |
| rogue-outlaw/Finishers/recommended-points | covered | outlaw.ts "Finisher below 6 combo points" | Deeper and Devious Stratagem (raise the cap) | a finisher cast below cap minus one points | Floor is one under the combo-point cap (6 at a 7 cap). Feeds the two rules below; its own share grade (above 5 / 10 / 20% inefficient) is a dead getter. Phase 3: every sample player's cap is 7 (the `max` on every finisher's combo points); the check takes its floor from that max. |
| rogue-outlaw/FinisherUse/cp-per-cast | covered | outlaw.ts "Finisher below 6 combo points" | Killing Spree, Coup de Grace; stratagem talents | a finisher spent at low points | Each spend of Dispatch, Between the Eyes, Slice and Dice, Kidney Shot, Killing Spree or Coup de Grace is good at the floor or above (Killing Spree one lower), otherwise fail. Live in the guide. Phase 3 (2026-10-17): finishers at 5 points or fewer (Slice and Dice and Killing Spree left out) separate top from weak: top 0–3 a pull on Vashnik, 1 and 24 on Sentinels (云梦默), weak up to 53 (Nicsterkins). About half come right after another finisher, at points a refund left (finisher to finisher with no builder between, the second is at 7 points at the median, every player), and some with Opportunity up (a Pistol Shot volley would overcap): neither is counted. Built for the rest, valued at the points short of 6 × the player's damage a point for that finisher (its own hits at 7 points ÷ 7: Dispatch 11–18k, Between the Eyes 17–35k, Coup de Grace 11–17k). Top 0–159k a pull (云梦默 159k, 7 presses; Decapre 27k), weak 24–342k (Nicsterkins 342k on Vashnik, 266k on Sentinels; Buckaneering 149k, Soulsick 152k). Small. |
| rogue-outlaw/BuilderUse/builder-at-high-cp | unverifiable | — | Hidden Opportunity, Audacity, Subterfuge, Echoing Reprimand, Ace Up Your Sleeve | a builder cast into banked combo points | Sinister Strike wasted above 5 points, Pistol Shot above 3, Ambush by proc and stealth conditions, other builders above the finisher floor. Display only (a donut), no grade. Phase 3 (2026-10-17): combo points are logged on finishers only, never on builders, and finishers refund points the log doesn't show (combo points spent ÷ builders pressed reads 4.6–7.8 per builder; finisher to finisher with no builder between, the second is at 7 points at the median), so the points at a builder can't be rebuilt. |
| rogue-outlaw/Guide/EnergyCapWaste/percent-at-cap | wrong | — (`primaryResourceCapFindings` removed for the spec) | Vigor | time sitting at max energy | Perfect 5%, good 10%, ok 15%, otherwise fail, over the whole fight. Phase 3 (2026-10-17), **proposed `wrong`, and the app's check removed for Outlaw pending the user's review**: Energy never limits Outlaw. Presses made below 45 Energy (a Sinister Strike's cost): 0–1 on 11 of 17 player-pulls, at most 36 (Buffoutlaw); GCDs late with the Energy for them barely there: 0 on 12 of 17, at most 14s (Nicsterkins, who sits at the cap on 3% of presses). The players at the cap most (Buckaneering 21%, Soulsick 20%, Nøwyouseemee 12% of presses) never waited on Energy, so their capped Energy bought nothing later. The shared `primaryResourceCapFindings` read top 0–1.32M (Âv 1.32M, Nøwyouseemee 1.11M, Scoreboard 195k) and weak 64k–1.13M, mostly Blade Rush pressed at the cap (its Energy-over-time buff) and Adrenaline Rush pressed at 200 (which raises the cap to 250: nothing is lost). Removed for Outlaw (melee.ts), for the user to approve or reject. Energy spent a second still separates a little (top 30.0–31.7, weak 22.8–31.7), but that is GCDs, which the gap check prices. |
| rogue-outlaw/AdrenalineRush/cp-at-cast | unverifiable | — | Adrenaline Rush, Improved Adrenaline Rush | Adrenaline Rush cast with 3+ points banked | Good at 2 or fewer points before the cast, fail above, since the cast grants points that overcap. Phase 3 (2026-10-17): Adrenaline Rush logs no combo points (only finishers do) and refunds the log doesn't show make the points between finishers unknowable, so the points at the cast can't be read. Expected value very low anyway. |
| rogue-outlaw/Abilities/adrenaline-rush-efficiency | covered | `burstGcdFindings` (Adrenaline Rush window); the cast itself see the candidate below | Adrenaline Rush; Restless Blades shortens its recharge | Adrenaline Rush held | 90% target on a 180s cooldown, whole-fight, with the expected last use even if the fight ends first and forced time counted as ready (core.md). The app judges the window it opens (GCDs that fit vs GCDs pressed) but not a held cooldown: see the candidate. Phase 3 re-run (2026-10-17): the window check fires on one of 17 player-pulls (Soulsick 66k); none of the top players. |
| rogue-outlaw/Restless-Blades/adrenaline-rush-recharge | candidate (unbuilt) | — | Restless Blades; Triple Threat, Supercharger | Adrenaline Rush (and Keep It Rolling, Killing Spree, Blade Rush) held past ready | Not tracked: Outlaw is absent from tracked-cooldowns.ts, and the shortest-interval method would invent drift because each finisher cuts the recharge. WoWAnalyzer models the cut as about one second per combo point spent on the finishers, scaled up while Triple Threat is up, with a larger credit for Coup de Grace and for the first spends after a Supercharger Adrenaline Rush (the exact multipliers are numbers from the spec and doubtful after 12.0.7). A `spentCooldownDrift` use needs a per-spend reduction, which the shared helper has only as a fixed amount per buff event or per resource unit spent: combo points are a spent resource, so the per-unit form fits for the base rule, while the multipliers and the Coup de Grace bonus would be a model, not log data. The pre-pull cast could read from the Adrenaline Rush buff (`prePullFromBuff`). Value: a held-late use of the window the app already prices (`valuePerUse` from the player's own damage in the window vs out). Premise check for phase 3: do top Outlaws hold it as long as weaker ones (pooling energy for a window is common). Expected value moderate, the best here, but it depends on whether combo-point spends are in the log. **Phase 3 (2026-10-17), unbuilt: the recharge doesn't fit the log.** Combo-point spends are in it (finishers carry the points), and a use is worth a lot (the player's damage in Adrenaline Rush ×1.6–3.4 their rate outside it, presses 1.04–1.10 a second against 0.87–0.94: it shortens the GCD), but no rebuilt ready time holds. With WoWAnalyzer's rule (1s a point, ×1.3 under Triple Threat, Coup de Grace +5, Preparation a reset), 38 of 58 top-player casts come before the rebuilt ready time, up to 25s before (Nøwyouseemee 5:48 → 6:18). Faster rules spread as widely (1.2–1.8s a point: cast − ready from −9 to +17s at 1.2, from +1 to +30s at 1.8; Triple Threat ×1.5–3, Jackpot counted too: the same): the top players' intervals sit at 27–32s whether 81 or 106 points were spent between them, so the points don't decide it. The only lenient rule (1s a point, nothing else) finds holds on 4 of 17 player-pulls, 0.7–19s a pull (Rosey 19s, Nicsterkins 17s, 云梦默 9s), under one use (~33s) for anyone, so it would never fire. Killing Spree (pressed with each Adrenaline Rush, 0.7–1.4M a press) and Blade Rush (86–197k a press) share the reduction and can't be rebuilt either. |
| rogue-outlaw/Guide/Cooldowns/cooldown-bars | covered | `checkCooldownDrift` where tracked; otherwise as above | Killing Spree, Blade Rush, Keep It Rolling, Preparation | skipped or late cooldowns | Colors the cast efficiency of five cooldowns; core default 80% (average −5, major −15 points) where the spellbook sets no target. Same whole-fight denominator and forced-time-as-ready error as every cast-efficiency rule (core.md). None of the five is tracked, so these have no app row today; Killing Spree's 180s with a 10% cut from Disorienting Strikes and Preparation's resets are other cooldown models the app would have to fit. Phase 3: still none tracked; Restless Blades shortens all five and doesn't fit the log (row above). |
| rogue-outlaw/Abilities/blade-rush-killing-spree-efficiency | wrong | — | Blade Rush, Killing Spree, Disorienting Strikes | skipped cooldowns | Efficiency at the core default, but its own advice text says to hold both to line up with Blade Flurry on several targets, which a flat efficiency target contradicts on cleave fights. Tier-set 4-piece cut hard-coded. Phase 3 re-check (2026-10-17), kept `wrong`, unverifiable either way: both recharge with Restless Blades, which doesn't fit the log (row above), so efficiency has no ready time to measure against. Killing Spree presses per minute alive don't separate (top 1.68–2.0, weak 1.44–2.1; it follows each Adrenaline Rush by 1–6s on single target and cleave alike). Blade Rush (7 of 17 take it): Nøwyouseemee and Âv 4.8–4.9 a minute, Decapre (97.7th) 2.6, weak 2.1–4.7, worth 86–197k a press against a Sinister Strike's 27–40k. |
| rogue-outlaw/RollTheBonesBuffs/uptime | candidate | — | none (Dragon Bone Dice changes only text) | Roll the Bones left down | Any Roll the Bones aura up, below 95 / 90 / 80% of the fight; a dead getter, the guide shows an ungraded bar. Log-visible. Whole-fight denominator, so forced time and Stasis count against the player; it also does not check which buffs rolled or if a re-roll was due (the model of rolls with their pandemic carry is a hand-kept tracker). The app has the buff-uptime machinery for DoTs (`dotUptimeFindings`) but no buff-uptime check. Value: the buffs' damage share from the player's own hits inside vs outside. Doubtful premise: the re-roll game (keep a good roll, reroll a bad one) is the real skill and uptime alone does not grade it. Expected value low. Phase 3 (2026-10-17), unbuilt: the uptime separates (top 91–100% of the pull, weak down to 60%), but most weak down time is time dead (Lobotomi 5:45–7:17, 步玎 5:12–6:41) or an opener without a roll, which top players do too (Decapre 0:00–0:24, 저는싸이코입니다 0:00–0:18: they open Adrenaline Rush late and roll with its Loaded Dice); Soulsick's 77s in seven 6–27s gaps is the one clear case. And its worth doesn't show in the log: a Sinister Strike (both hits) does the same with a roll up as without (Loktark 45k vs 44k, Rosey 36k vs 39k, Stabbybuddy 34k vs 41k, Lobotomi 40k vs 41k), its extra-hit rate the same within noise, and combo points aren't logged on builders. The stages' crit (Jackpot) and Restless Blades bonus (Triple Threat) can't be priced from the hits either. |
| rogue-outlaw/Audacity/builder-while-proc-up | candidate | — | Audacity | Sinister Strike or Pistol Shot pressed with an Audacity proc up | Share of such casts to all builder casts, above 1 / 5 / 10%; a dead getter. Log-visible (the buff is a buff event; an 800ms lookback guards a Pistol Shot that procs it). Value: the difference between Ambush and the builder cast, from the player's own Ambush vs Sinister Strike hits. Separating a mistake from play: stealth Ambush is free and a proc can be intentionally saved; top players may take a Sinister Strike for combo-point reasons. Expected value low. Phase 3 (2026-10-17): no sample player takes Audacity (no Audacity buff on any of 17 player-pulls; 0–1 Ambush a pull, from stealth), so the rule is skipped on every pull; unmeasured. |
| rogue-outlaw/Opportunity/sinister-with-proc | wrong | — | Opportunity | Sinister Strike cast with Opportunity up | Share of Sinister Strike casts, above 0 / 5 / 10%; a dead getter. Log-visible. It ignores the Pistol Shot point limit in BuilderUse, so the two rules can disagree. Phase 3 (2026-10-17), **proposed `wrong`**: the top players do it as much as anyone (Âv 27 of 100 Sinister Strikes, Scoreboard 21 of 99, Nøwyouseemee 15 of 92, Decapre 15 of 101; weak 0–36: Nicsterkins 0, Ilikesneakin 36), and an Opportunity never re-procs while one is up (0–4 a pull), so nothing is overwritten; what's lost if it expires is priced by `checkProcs` (procs.ts: Opportunity, 12s; see the statistics row). It's combo-point play: a Pistol Shot volley at high points overcaps. |
| rogue-outlaw/Dispatch/dispatch-while-bte-ready | unverifiable | — | Ace Up Your Sleeve, Gravedigger | Dispatch cast while Between the Eyes was ready | Share of Dispatch casts, above 0 / 10 / 20%; a dead getter. The cooldown model never starts Between the Eyes (its own comment says Crack Shot removes it in stealth) and the module is off unless Ace Up Your Sleeve is talented, so readiness is modelled, not logged. |
| rogue-outlaw/APL/hidden-opportunity-rotation | superseded | the spec checks | Hidden Opportunity, Subterfuge, Audacity, Coup de Grace | casts out of the priority order | Dead code, never enabled. Roll the Bones first, then Killing Spree and Coup de Grace and the two finishers at six-plus points (five with a proc or Subterfuge), then Ambush with Audacity or in stealth, Pistol Shot on Opportunity, Sinister Strike otherwise. The "fewer than 5 buffs" condition can never be false. Single-target. Judged through the per-rule rows above. |
| rogue-outlaw/APL/keep-it-rolling-rotation | superseded | the spec checks | Keep It Rolling, Subterfuge | casts out of the priority order | Dead code. Keep It Rolling when a strong roll is up, finishers at five-plus points, Pistol Shot on Opportunity at low points. Its Roll the Bones conditions join with the language's logical-or, which collapses to the first one (always true). Single-target. |
| rogue-outlaw/ComboPointDetails/wasted-cp | unverifiable | — | none | combo points lost to the cap | Waste above 5 / 10 / 20% of generated points. Pooled over all generators, so unavoidable bonus-point waste counts. Phase 3 (2026-10-17): as BuilderUse, the points between finishers can't be rebuilt (logged on finishers only; refunds unlogged), so neither can their waste. |
| rogue-outlaw/EnergyDetails/wasted-generator-energy | wrong | — (`primaryResourceCapFindings` removed for the spec) | none | generator energy lost to a full bar | Waste above 5 / 10 / 20% of generator energy (event gains only). The app counted the casts made at the cap; passive regen lost is unverifiable (core.md). Phase 3 (2026-10-17): proposed `wrong` with the Energy cap row above (Energy never limits Outlaw; the app's check is removed for the spec pending the user's review). |
| rogue-outlaw/InstantPoison/proc-rate | no-damage | — | none | — | Poison hits per melee hit, below 20 / 15 / 10%. A luck measure; the ratio is not distorted by downtime but small samples are noisy. |
| rogue-outlaw/statistics | no-damage | — | — | — | Display only: Slice and Dice uptime, the Roll the Bones explanation and four-buff bar, Adrenaline Rush uptime bar and good-cast summary, energy and combo-point graphs, builder and finisher donuts, wasted-proc counts for Audacity and Opportunity, Echoing Reprimand points, Deeper Daggers uptime. Phase 3 (2026-10-17): the Opportunity count hid a damage effect, so it's measured: Opportunity (195627, three Pistol Shot stacks a proc) runs out at 12.0s (8 spans at 11.99–12.03s on 17 player-pulls, the next longest 6.37s) and is now in procs.ts, spent by Pistol Shot, valued at the whole volley (3 × the player's Pistol Shot). Unused: top Âv 1 (1:03, 210k: six stacks) and Decapre 1 (1:02, 109k), the other four none; weak Soulsick 3 (one unforced, 4:59), Loktark, Lobotomi, Ilikesneakin 1. Fang Strike (1301405, a free finisher) has no duration: its press-less removals span 4.7–9.3s and one 15.0s, most beside a free Coup de Grace; not added. |
| rogue-shared/utility | no-damage | — | — | — | Crimson Vial, Evasion, Feint, Cloak of Shadows, Shroud of Concealment, Vanish (also an opener), Blind, Kidney Shot, Sprint, Shadow Step, Grappling Hook, Tricks of the Trade, Thistle Tea, Between the Eyes and Blade Flurry readiness (not graded), Gouge, Kick, Distract, Arcane Torrent. Utility and defensives are not judged. |

Not rules (models the rules above rest on): the Outlaw combo-point tracker
(bonus points from Sinister Strike's extra hit), the energy-cap tracker (a
hard-coded Adrenaline Rush regen multiplier), the Roll the Bones cast
tracker (per-cast buff grouping, pandemic carry), the Between the Eyes
debuff timer, the custom cooldown model, the Restless Blades and
Preparation reductions and resets (the spec writes them into the event
stream), the cast-link and Fan the Hammer normalizers, the opportunity
refresh normalizer, the shared resource trackers and energy cost model,
the stealth helpers and filtered damage trackers, the Thistle Tea event
link.

## Candidates left

After phase 3 (2026-10-17), all measured; none worth building now:

- **Restless-Blades/adrenaline-rush-recharge**: the biggest lever
  (Adrenaline Rush ×1.6–3.4 the player's rate), but no recharge rule fits
  the log, and the lenient one never fires. A fit would need what the
  log doesn't show (refunds, talent effects); revisit if one turns up.
- **RollTheBonesBuffs/uptime**: separates, but the down time is mostly
  death or the opener, and the roll's worth doesn't show in the hits.
- **Audacity/builder-while-proc-up**: no sample player takes Audacity.

Also measured, outside any WoWAnalyzer rule: a GCD after Killing Spree
comes ~0.3s late on every player (Nøwyouseemee six times, ~60k each), a
floor of the channel's end, not a mistake.
