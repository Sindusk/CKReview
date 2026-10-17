# WoWAnalyzer audit: Arms Warrior

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Warrior shared layer,
  then the spec), spot-checked at their source lines (3 of
  3 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares 12.1, but support level is "Foundation" (partial): the
  page itself says it has limited ability to parse logs and gives no
  accurate guidance. Last change 2026-08-29 (priority-list cleanup);
  the changelog is per spec, so every module below is "12.1, spec last
  touched 2026-08-29". **Almost nothing is graded.** The guide has four
  parts: a disclaimer, the shared downtime section, a cooldown graph with
  no grade, and the priority list's annotations. Every threshold getter in
  the spec's own modules (Mortal Strike usage, Overpower waste, Slam,
  Sweeping Strikes, Bladestorm, Demolish, dot uptime, dot refreshes, rage
  waste) has no consumer, so the casts they flag are timeline notes only.
  The thresholds are recorded below in case a guide section switches them
  on. The priority list is single-target by its own admission.
- **App:** `lib/damage/wow/specs/melee.ts` (`"Arms Warrior"`: Avatar
  window through `burstGcdFindings`, Rage at the cap through
  `primaryResourceCapFindings`, Avatar and Colossus Smash through
  `spentCooldownDrift`), `shared.ts`, `potion.ts`, generic checks. No
  tracked-cooldowns.ts entry for Arms (Avatar and Colossus Smash spread too
  far; the rest are not cast in the survey). No DoT check is wired for Arms.
  No case study against a WoWAnalyzer page: the header of melee.ts has none
  for Arms. The recharge rule was measured on three Arms Warriors
  (qpZx3mWaG7gcDdYB, NK1hBtW9rckdjq36; `shared.ts`).
- **Survey fact (spell-data.ts, 19 Arms players):** Demolish, Ravager and
  Champion's Spear are never cast by name; Cleave (555 casts) and Heroic
  Strike (655) are, and WoWAnalyzer's priority list does not check Cleave
  at all. The current build is not the one this spec's rules assume, so
  rows that need a talent the survey never shows would fire on nothing.
- **Phase 3:** done 2026-10-17 (Claude Opus 5.5). Every log was already
  on disk (no fetch; ~25 WCL points of rankings). 44 Arms player-pulls,
  all Mythic:
  - top, Entombed Sentinels: Peraa (baRCnPv62YQ1dJZN, 100th), Белегард
    (Vr8dLPtFYWA4G1yg, 99.7th) and Quessa, Eroka (VWMbYPRyxCAmhZFj),
    Nagafenw (ACmXHMFtaPLR9k8w), Crimw (dG8D9y6WxrfmtgXp), Gromnakspot
    (LckJC7GMhQvD6rdw), Chudstrike (GndQ9VFWtLzNjKpk); Vashnik: Hanitus
    (hjHXmdnJFwTPpMtK), Gillick (Kag91qVZ2YJ7MQAb);
  - weaker: Loundy (94.8th), Gnomerouge (93.7th), Jisoozuha
    (JvQpZk3CXj78Dx2f), Tiapanki (LCFp3wbHvQqNP4my), Captñkrunch
    (r9CX1kpRGLmKJH4M), 蒼武影 (7B1wQbjNhgXJDaHC), the static's Hervous
    (qpZx3mWaG7gcDdYB, 17th, and 16 pulls in gVDPhzp61Zm29HMw) and
    Cocomber (qpZx3mWaG7gcDdYB, 72nd).

  Talents, from casts, buffs and hits: all 44 play one build: Slayer
  (Slayer's Strike, Executioner's Precision, Imminent Demise, Sudden
  Death), Colossus Smash (no Warbreaker), Avatar, Bladestorm with its
  Mortal Strikes, Sweeping Strikes, Cleave, Master of Warfare, and Rend
  and Deep Wounds applied by Mortal Strike / Cleave and the strikes (Rend
  is cast by name twice in 44 pulls). Nobody plays Colossus (Demolish,
  Colossal Might), Ravager or Champion's Spear.

  Built in `lib/damage/wow/specs/arms.ts` (commit db3d10c): **Bladestorm
  outside Colossus Smash**, and **Colossus Smash drift** revalued. The
  Smash window (208086) lowers armor: hits after armor are ×1.3–1.6
  inside it, unmitigated hits ×1.0, so the shared drift had priced a use
  at 10–24% (Hervous 196k a use; now 581k). Not built, with numbers below:
  Bladestorm's cooldown (no model fits the log), Rend and Deep Wounds
  uptime, the priority list, the Mortal Strike readiness rows.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Arms sets or adds.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| warrior-arms/AlwaysBeCasting/downtime-pct | superseded | `checkGcdGaps` | none | idle time | Graded good up to 15%, ok to 20%, fail above (core default 5 / 10 / 15). Whole-fight denominator, forced downtime not removed. |
| warrior-arms/Guide/cooldown-graph | no-damage | — | Avatar, Bladestorm, Colossus Smash, Ravager, Demolish (each needs its talent) | — | A bar per cooldown, red where a whole extra use would have fit. Not graded. Counts forced time as ready and misses reductions it doesn't model. The Avatar and Colossus Smash readings are covered by the cooldown rows below. |
| warrior-arms/Overpower/wasted-stack | unverifiable | — | none | Overpower cast at two stacks with Mortal Strike ready, outside execute | Wasted casts over all Overpower casts above 0 / 5 / 10%, no consumer. Needs Mortal Strike's ready time, which Battlelord resets (Not rules) hide, and an execute-range flag the app has no source for. Value would be the damage of the Mortal Strike pressed late. Low. Phase 3 (2026-10-17): **Mortal Strike's readiness can't be rebuilt**. Pressed Mortal Strikes (outside Bladestorm) came as little as 3.0–3.4s apart on every top player, against a median of 4.6–5.9s, so resets the log doesn't show are common. Overpower came 0.7–1.1s apart (charges, Tactician resets). |
| warrior-arms/Slam/slam-while-mortal-strike-ready | unverifiable | — | none | Slam cast while Mortal Strike was ready, outside execute | Bad over total Slam casts above 0 / 5 / 10%, no consumer. Same readiness and execute-range problems as the Overpower row. Value: Mortal Strike's damage per cast less Slam's, per occurrence. Slam is 370 casts in the survey, so there is data to value it. Cleave fights are not graded (a Slam may be right with Sweeping Strikes up). Phase 3 (2026-10-17): Mortal Strike readiness can't be rebuilt (see the Overpower row). Slam counts don't separate players either: Eroka 29 a kill, Peraa 12, Quessa 7, against Hervous 19 and Cocomber 26. |
| warrior-arms/SweepingStrikes/not-during-colossus-smash | wrong | — | Sweeping Strikes, Colossus Smash | Sweeping Strikes within 1s after Colossus Smash | Bad over total above 0 / 20 / 50%, no consumer. The message says "during Colossus Smash" but the test sees only the first second; a cleave cooldown has nothing to do with burst alignment on one target. Phase 3 re-check (2026-10-17), **stays `wrong`**: on 11 players (the top seven, Hervous, Cocomber, Jisoozuha, Tiapanki), no Sweeping Strikes came within 1s after a Colossus Smash. They came 7.4–47s after it, pressed when a second target was up. The rule fires on nothing, and its premise ties a cleave button to a single-target window. |
| warrior-arms/Bladestorm/aligned-with-colossus-smash-or-avatar | verified | `bladestormOffSmash` (arms.ts) | Bladestorm, Colossus Smash | Bladestorm pressed outside Colossus Smash, with no Bladestorm in the next Smash window | Bad over total above 0 / 10 / 30%. The cast annotation does show. A cooldown the player did not talent reads as ready, so it would flag every cast. Phase 3 (2026-10-17): **the premise holds, and more broadly than the rule**. Every top player presses Bladestorm 1–2.5s after each Colossus Smash and holds it through the whole wait, up to 30s+, not only when the Smash is under 5s away. Players who press between Smashes get no more Bladestorms a minute (1.5–2.2 vs the top players' 1.75–2.0). The Smash window lowers armor: ×1.3–1.6 on hits after armor, Bladestorm's ticks included. Built as **Bladestorm outside Colossus Smash**: the channel's hits × (ratio − 1), less the presses it would have displaced in the window. Excused: an extra use (the next window had its own Bladestorm), the pull's end, forced time, and adds that die before the next Smash. Top players 0 (Peraa, Eroka, Crimw, Gromnakspot, Quessa, Chudstrike, Gillick, Hanitus), Белегард 184k, Nagafenw 261k. Weaker: Jisoozuha 1.33M, Cocomber 656k (Pull 3, 3:14, 3:37, 5:41), Tiapanki 549k; Hervous 75k on the case study (5:15) and 1.65M over 16 pulls. The Avatar half isn't built: Avatar comes with every other Smash, and Bladestorm follows the Smash. |
| warrior-arms/Demolish/no-demolish-in-execute-without-colossus-smash | candidate | — | Demolish; Massacre moves execute to 35% | Demolish hit in execute range without Colossus Smash on the target | Count above 0 / 1. The execute flag is set once and never cleared in the source, so after one low-health hit every later Demolish counts. Demolish is never cast in the survey: it would fire on nothing now. Value: Demolish damage with vs without the buff. Phase 3 (2026-10-17): **nothing to measure**. None of the 44 Arms player-pulls casts Demolish or carries Colossal Might, so every sample player is Slayer. |
| warrior-arms/MortalStrike/usage-vs-possible | superseded | `checkGcdGaps` | none | fewer Mortal Strikes than the cooldown allows | Casts over the haste-scaled 6s maximum for the whole fight, below 90 / 80 / 70%. Forced time counts as ready and Battlelord resets are invisible. A missed Mortal Strike is an idle GCD (the gap check) or a lower filler in its place (the Slam row). Free Mortal Strikes from Bladestorm are relabelled and not counted; the app also excludes them from presses (`game.ts`). The 80% Mortal Strike and Overpower efficiency targets in Abilities (suggestion off) are the same thing. |
| warrior-arms/DeepWoundsUptime/uptime | candidate | — | none (mastery) | Deep Wounds off every enemy | Below 80 / 70 / 60% of the whole fight; the app's `dotUptimeFindings` could take it (it is in the survey's DoT list, 32.7 a minute). Applied by many abilities, so it is near full for anyone pressing buttons: expected variance is small. Low. Phase 3 (2026-10-17), **measured, not built** (it fires on the top players as much). A trial `dotUptimeFindings` on Deep Wounds (262115, applied by Execute, Mortal Strike, Heroic Strike and Slam: on Eroka 11 applications, 212 refreshes) read: top Peraa 118k, Белегард 45k, Eroka 43k, Quessa 0; weaker Tiapanki 128k, Cocomber 65k, Hervous 0, Jisoozuha 0. The gaps are target swaps, not missed presses. |
| warrior-arms/RendUptime/uptime | candidate | `dotUptimeFindings` available, not wired | Rend | Rend off the target | Below 70 / 65 / 60%. The priority list explicitly excludes Rend, so uptime and rotation disagree. Rend is in the survey's DoT list (17.6 a minute) so players do take it. Premise check first: top players may drop it for cooldown windows. Phase 3 (2026-10-17), **measured, not built** (negligible). Rend (388539) isn't pressed: it is cast by name (772) twice in 44 pulls, and its applications follow Mortal Strike or Cleave (Eroka 37 and 25, Hervous 42 and 16). It ticks for ~3k a second of uptime. A trial `dotUptimeFindings` read top players 9–23k a pull and the weaker 0–85k, with Hervous's case-study pull the most at 312k (a 55.6s gap at 2:59 × 3k/s). A Rend gap means Mortal Strike or Cleave wasn't pressed, which the gap check already prices. |
| warrior-arms/DeepWoundsRefreshes/early-refresh | wrong | — | none | Mortal Strike on a target already carrying Deep Wounds, in execute range | Efficiency below 90 / 80 / 60%. The Mortal Strike is cast for its own damage; the lost tail of a mastery DoT is negligible. The source also exempts most casts (non-execute, unseen enemies) and has dead exemption branches. Phase 3 re-check (2026-10-17), **stays `wrong`**. Deep Wounds is refreshed by every strike: on Eroka 212 refreshes to 11 applications, Hervous 153 to 15. Every one of Execute, Mortal Strike, Heroic Strike and Slam refreshes it, so a refresh is never a choice, and nobody presses a button for Deep Wounds. |
| warrior-arms/RendRefreshes/early-refresh | wrong | — | Rend | Rend recast with time left | Efficiency below 90 / 80 / 70% of its 14s. The core pandemic candidate (core.md): value by the duration lost, not as a share of casts. Lowest value. Phase 3 (2026-10-17), **proposed `wrong`**: the build every sample player plays applies Rend through Mortal Strike and Cleave. It is pressed by name twice in 44 pulls, so there's no Rend cast to refresh early (Eroka: 53 refreshes, all by Mortal Strike, Cleave or Avatar). |
| warrior-arms/RageDetails/rage-waste | covered | `primaryResourceCapFindings` | none | rage generated into a full bar | Wasted over wasted plus generated, below 75 / 70 / 65% efficiency; no consumer, a statistic only. A code comment says Arms cares about waste mainly in execute. WoWAnalyzer rebuilds swing rage by estimate; the app sees the cap only where the log reports it. Not measured on an Arms pull. Phase 3 (2026-10-17): **fires on Arms**, reading Rage (type 1). "Rage capped" fires on 41 of the 44 player-pulls, the top players included (Eroka 1.26M at 0:08: 6 casts at full Rage, mostly Overpower), and Hervous 3.23M and Cocomber 3.38M on the case study. |
| warrior-arms/AplCheck/priority-order | candidate | — | Slayer or Colossus list | a cast with a higher list rule available | One check for the list rules marked `superseded` below (Mortal Strike, Overpower, Heroic Strike, Execute and Slam ordering, with their stack conditions), not one per rule. Each cast is valued by that rule's spell's average damage per cast less the cast's own. The list picks Slayer with Slayer's Dominance, otherwise Colossus (Mountain Thane falls through to Colossus, inferred), and sets execute at 35% with Massacre, else 20%. Single-target by design: Cleave, Whirlwind, Sweeping Strikes, Thunder Clap and Ravager are never checked, so it misreads cleave. Build only if a page and a log disagree. Phase 3 (2026-10-17), **not built**. No Arms WoWAnalyzer page is on disk to disagree with. Most of its rules turn on Mortal Strike being ready, which the log can't rebuild (see the Overpower row). The Colossus list fires on nothing (all 44 player-pulls are Slayer). Its Sudden Death part is `checkProcs`'. |
| warrior-arms/AplCheck/slayer-hs-execute | superseded | priority-order (below) | Slayer; Master of Warfare | in execute with Master of Warfare up, Heroic Strike not first | Heroic Strike first in execute range while the buff is up. Master of Warfare is in the survey's buffs, and Heroic Strike is cast 655 times. Value: what the unused buff costs. A priority rule: see Candidates left. |
| warrior-arms/AplCheck/slayer-ms-execute-two-precision | superseded | priority-order (below) | Slayer; Executioner's Precision | in execute with two Precision stacks, Mortal Strike not cast | Mortal Strike at two stacks of the debuff on the target. Stack counts are in the log. |
| warrior-arms/AplCheck/slayer-op-execute-two-opportunist | superseded | priority-order (below) | Slayer; Opportunist | in execute with two Opportunist stacks, Overpower not cast | Overpower at two buff stacks. |
| warrior-arms/AplCheck/slayer-execute-sudden-death | covered | `checkProcs` (expiries) | Slayer; Sudden Death | Sudden Death left to expire | Execute with Sudden Death in execute range. Only the expiry of an unused proc is covered, and whether `checkProcs` registers Sudden Death as a consumable proc on an Arms pull is not measured; the ordering part is the candidate. Phase 3 (2026-10-17): **fires on Arms** (Sudden Death 52437 is in procs.ts, 12s, spent by Execute 281000). There are 12 expiries on the 44 player-pulls, 9 of them in forced time (most at 0:56–0:57 on Entombed Sentinels: Stasis). The unforced ones are Dw 172k (a4kX1DNT27yHGvqJ, 4:42) and Hervous 138k (Nek'zali Pull 2, 2:22) and 190k (Coiled Altar Pull 1, 3:00); no top player has an unforced one. |
| warrior-arms/AplCheck/slayer-execute-40-rage | superseded | `primaryResourceCapFindings` | Slayer | — | Execute at 40+ rage in execute range. The threshold keeps rage under the cap; the cap check counts the cap itself. |
| warrior-arms/AplCheck/slayer-op-execute | superseded | priority-order (below) | Slayer | in execute, Overpower not cast when listed | Overpower in execute range after the stack-conditioned rules. Filler order. |
| warrior-arms/AplCheck/slayer-hs | superseded | priority-order (below) | Slayer; Master of Warfare | Master of Warfare up, Heroic Strike not cast | Same rule outside execute. |
| warrior-arms/AplCheck/slayer-op-two-opportunist | superseded | priority-order (below) | Slayer; Opportunist | two Opportunist stacks, Overpower not cast | Same rule outside execute. |
| warrior-arms/AplCheck/slayer-ms-outside-execute | superseded | priority-order (below) | Slayer | not in execute, Mortal Strike not cast | Mortal Strike outside execute. Overlaps the Slam row. |
| warrior-arms/AplCheck/slayer-execute | covered | `checkProcs` (expiries) | Slayer; Sudden Death | Sudden Death left to expire | Execute whenever usable (Sudden Death, or 20 rage in execute). Sudden Death part covered as above; the rage part is the rage-cap check's. |
| warrior-arms/AplCheck/slayer-op-outside-execute | superseded | priority-order (below) | Slayer | not in execute, Overpower not cast | Filler order. |
| warrior-arms/AplCheck/slayer-slam | superseded | priority-order (below) | Slayer | not in execute, Slam not the filler | Slam as the last filler. Filler-over-filler, small per cast. |
| warrior-arms/AplCheck/colossus-hs-execute | superseded | priority-order (below) | Colossus; Master of Warfare | as the Slayer rule | In execute with the buff up, Heroic Strike. |
| warrior-arms/AplCheck/colossus-ms-execute | superseded | priority-order (below) | Colossus; Colossal Might, Executioner's Precision | in execute, Mortal Strike not cast with two debuff stacks or under 10 Colossal Might stacks | Both stack counts are in the log. |
| warrior-arms/AplCheck/colossus-execute-sudden-death | covered | `checkProcs` (expiries) | Colossus; Sudden Death | Sudden Death left to expire | Execute with Sudden Death in execute range. Expiry only, as above. |
| warrior-arms/AplCheck/colossus-execute-deep-wounds-75-rage | superseded | `primaryResourceCapFindings` | Colossus; Deep Wounds | — | Execute above 75 rage. A rage threshold in front of the cap. |
| warrior-arms/AplCheck/colossus-op-execute | superseded | priority-order (below) | Colossus | in execute, Overpower not cast | Filler order. |
| warrior-arms/AplCheck/colossus-execute-75-rage | superseded | `primaryResourceCapFindings` | Colossus | — | Execute above 75 rage, the same threshold without the Deep Wounds condition. |
| warrior-arms/AplCheck/colossus-ms-below-10-colossal-might | superseded | priority-order (below) | Colossus; Colossal Might | under 10 stacks, outside execute, Mortal Strike not cast | Keeps the stack count building. |
| warrior-arms/AplCheck/colossus-hs | superseded | priority-order (below) | Colossus; Master of Warfare | buff up, Heroic Strike not cast | Same rule without the execute condition. |
| warrior-arms/AplCheck/colossus-execute-two-sudden-death | superseded | priority-order (below) | Colossus; Sudden Death | two Sudden Death stacks, Execute not cast outside execute | The stack count is in the log. Expiry is `checkProcs`'. |
| warrior-arms/AplCheck/colossus-ms | superseded | priority-order (below) | Colossus | not in execute, Mortal Strike not cast | Overlaps the Slam row. |
| warrior-arms/AplCheck/colossus-execute | covered | `checkProcs` (expiries) | Colossus; Sudden Death | Sudden Death left to expire | Execute whenever usable; expiry only, rage part is the cap check's. |
| warrior-arms/AplCheck/colossus-op | superseded | priority-order (below) | Colossus | not in execute, Overpower not cast | Filler order. |
| warrior-arms/AplCheck/colossus-slam | superseded | priority-order (below) | Colossus | not in execute, Slam not the filler | Last filler. |
| warrior-arms/Abilities/colossus-smash-efficiency | covered | `spentCooldownDrift` (Colossus Smash, 45s) | Colossus Smash; Anger Management | Colossus Smash held | 90% target. Not tracked by `checkCooldownDrift`: the shortest and median intervals measured 24.5 / 32.2s, so the app models the recharge from rage spent. WoWAnalyzer counts forced time as ready; the app takes it out. Phase 3 (2026-10-17): **the value per use was wrong, now fixed** (arms.ts `smashDrift`, commit db3d10c). The window (208086, 10.0s) lowers armor. Hits after armor are ×1.3–1.6 inside it, unmitigated hits ×0.98–1.08, and magic hits ×1.00. `observedWindowBonus` reads unmitigated hits, so a lost use was priced at 10–24% of the window. It is now what each window added to the hits in it: 0.56–1.08M a use (Hervous on the case study 581k, was 196k). It fires on no top player. Weaker: Hervous at Entombed Sentinels Pull 1 1.65M (2:15, two uses) and 0.56–1.08M on four more of his pulls, Tiapanki 1.47M, Lukethewar 721k. |
| warrior-arms/Abilities/avatar-efficiency | covered | `spentCooldownDrift` (Avatar, 90s) + `burstGcdFindings` (Avatar window) | Avatar; Anger Management | Avatar held, idle inside the window | 90% target. Measured intervals 51.2 / 64.1s, so untracked. The window check is the app's own; WoWAnalyzer has no Avatar window grade. |
| warrior-arms/AngerManagement/cooldown-reduction | verified | `spentCooldownDrift` | Anger Management | — | Every 20 rage spent takes one second off the remaining Colossus Smash and Avatar cooldowns; reduction while ready is counted as wasted. The app measured the same rule on three Arms Warriors (an Avatar after 650 rage predicted 57.5s, observed 57.5s). Matched; WoWAnalyzer's wasted-reduction count is display only. |
| warrior-arms/Abilities/bladestorm-efficiency | unverifiable | — | Bladestorm; Executioner | Bladestorm held | 70% target, suggestion off; the app's melee.ts says it resets (15-20s comebacks) and leaves it unjudged, and the survey shows intervals of 15.2s minimum and 34.3s median. The reduction rule (class layer): five seconds off per Executioner stack on an Execute made with Sudden Death up. `spentCooldownDrift`'s `reduceOn` takes a fixed amount per buff event, so it fits if Executioner stacks log as buff events; whether they do on the player is the measurement. Value: a Bladestorm channel including its free Mortal Strikes. Best of the candidates. Phase 3 (2026-10-17), **the cooldown can't be rebuilt from the log**. Executioner (445584) does log as a player buff, but its stacks rise and fall between Executes (applied, stack, stackRemoved every few seconds, not only on Executes). WoWAnalyzer's model (90s less 5s per stack on a Sudden Death Execute) summed 13–21 stacks a cycle, so it predicts negative cooldowns: Pházéd's 11.1s at 1:01 (PAgdKqkXDTRfLnJy) after 4 Sudden Death Executes is the shortest of 345 intervals. Every interval had 3+ Sudden Death Executes in it, but the shortest by count isn't monotonic (3: 17.7s, 4: 11.1s, 5: 16.2s, 6: 20.5s). No rage or proc count fits it. What matters is built instead: the top players tie Bladestorm to Colossus Smash, so its placement is judged (`bladestormOffSmash`, aligned row above), and the Smash's own drift prices a missed cycle. |
| warrior-arms/Abilities/demolish-efficiency | candidate | — | Demolish; Colossal Might | Demolish held | 90% target, 45s. Reduction: refreshing Colossal Might at 10 stacks takes five seconds off (a code comment says two; the constant says five; unresolved). Fits `reduceOn` with `prePullFromBuff` unneeded. Never cast in the survey, so fires on nothing now. Phase 3 (2026-10-17): nothing to measure, 0 of 44 player-pulls cast Demolish. |
| warrior-arms/Abilities/ravager-and-spear-efficiency | candidate | — | Ravager; Champion's Spear | either held | 90% and 70% targets, 90s each. Neither is cast in the survey: add to tracked-cooldowns.ts only when a log shows them, measuring the shortest and median intervals first (the survey rule). Low. Phase 3 (2026-10-17): nothing to measure, 0 of 44 player-pulls cast either. |
| warrior-arms/Abilities/cleave-efficiency | wrong | — | Cleave | — | 60% target, 4.5s haste-scaled, with a code comment that the author is unsure when it is worth it. Whether a cleave press is right depends on the target count; a whole-fight share is fight-blind. Cleave is cast often (555 times in the survey) and the priority list never checks it. Phase 3 re-check (2026-10-17), **stays `wrong`**. A 60% share of a 4.5s cooldown is about 8 Cleaves a minute; the top players press 2.3–3.9 (Peraa 3.6, Eroka 3.6, Белегард 2.3), so the rule would fail every one. Half of their Cleaves hit one enemy (Cleave also applies Rend). The weaker players' rates (Hervous 1.4, Cocomber 5.3) bracket the top ones, so the count says nothing about the player. |
| warrior-arms/Abilities/overpower-and-mortal-strike-efficiency | superseded | `checkGcdGaps` | none | — | The 80% targets (suggestion off); same as the Mortal Strike usage row. |
| warrior-shared/Executioner/bladestorm-while-not-enraged | no-damage | — | Bladestorm | — | Fury only (the handler compares the spec); an Arms equivalent was considered and not written. |
| warrior-arms/utility | no-damage | — | Die by the Sword, Spell Reflection, Rallying Cry, Charge, Heroic Leap, Storm Bolt, Impending Victory, Defensive Stance | — | Defensives, movement, healing and utility; efficiency targets are low or 1%. (Die by the Sword is declared with a one-second cooldown, a unit mistake.) Not judged. |
| warrior-arms/statistics | no-damage | — | various | — | Display only: Deep Wounds and Rend bars, Tactician procs, Overpower buffs wasted, rage wasted %, cooldown throughput (damage in Sweeping Strikes, Avatar and a ten-second Colossus Smash window), Defensive Stance damage, Fatal Mark, Champion's Spear damage, Spell Reflection mitigation (tooltip says 20%, computed 25%), Impending Victory healing, and the talent sub-statistics (they render only inside a container that is commented out, so probably never show). |

## Not rules

Hand-maintained models the rules above rest on: the priority-list branch
choice (Slayer or Colossus list by talent), the execute-range tracker
(per-enemy flag from health on the player's own damage events, ending two
seconds after the last in-range hit; the upper-bound test can never be true),
the Tactician (Overpower reset) and Battlelord (Mortal Strike reset) cooldown
models, Executioner's Bladestorm reduction, the Unhinged relabelling of free
Mortal Strikes, the Improved Execute rage refund, Overpower and Battlelord
event reordering, the Demolish cast link, the Sudden Death stack-refresh
filter, the class rage model (tracker, swing rage generation, attribution,
rage scaling), the Cooldown throughput configuration and the Abilities
spellbook. Table values: not extracted. Dead code: the commented-out talents
container.

## Candidates left

Phase 3 (2026-10-17) worked this list in order; the rows hold the
numbers. In short:
1. Bladestorm efficiency: `unverifiable` (no cooldown model fits). Its
   placement was built instead (Bladestorm outside Colossus Smash).
2. priority-order: not built (no page; Mortal Strike readiness can't be
   rebuilt; the Colossus list fires on nothing).
3. Rend and Deep Wounds uptime: measured, not built (Rend ~3k/s and
   pressed by nobody; Deep Wounds fires on the top players as much).
4. Demolish, Ravager, Champion's Spear: 0 of 44 player-pulls cast them.
5. Overpower wasted stack, Slam with Mortal Strike ready: `unverifiable`.
6. Rend early refresh: proposed `wrong` (Rend isn't pressed).
Found on the way: Colossus Smash's drift had been priced from unmitigated
hits; fixed in arms.ts. Held for the user's review: the `wrong` rows
(Sweeping Strikes, Deep Wounds refresh, Cleave efficiency kept; Rend
early refresh proposed).

The list as phase 2 left it:

1. **Bladestorm efficiency with the Executioner reduction**: the one large
   gap in the app's Arms coverage. First measure whether Executioner stacks
   appear as player buff events and whether the survey's 15.2s minimum
   interval is explained by them. Value from the cast, the channel's damage
   including its free Mortal Strikes. Separating a mistake from a top-player
   habit: holding it for a Colossus Smash or Avatar window is deliberate.
2. **priority-order**: one check for the list rules (Mortal Strike /
   Overpower / Slam / Execute rows): each cast with a higher rule available,
   valued by that spell's average damage per cast less the cast's own.
   Single-target caveat: Cleave and Sweeping Strikes are not in the list.
   Build only if a page and a log disagree.
3. **Rend and Deep Wounds uptime** through `dotUptimeFindings` (the ids are
   in the survey's DoT list). Cheap to build; Deep Wounds will rarely fire.
4. **Demolish, Ravager and Champion's Spear** (`reduceOn`, tracked cooldowns,
   Demolish in execute): worth nothing until a log casts them.
5. **Overpower wasted stack, Slam with Mortal Strike ready**: need Mortal
   Strike readiness, which Battlelord resets hide. Low.
6. **Rend early refresh**: lowest.

The Sweeping Strikes, Deep Wounds refresh and Cleave rows are `wrong`
without measurement; their premises are visible in the source alone.
