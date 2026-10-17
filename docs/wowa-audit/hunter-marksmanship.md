# WoWAnalyzer audit: Marksmanship Hunter

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Hunter shared layer,
  then the spec), spot-checked at their source lines (4 of
  4 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** stale on paper: the config declares 11.0.5 and "partly
  maintained", yet the changelog shows a real pass in 2026 (2026-07-15 six
  entries: Precise Shots flag, Trueshot recharge rates corrected, Wailing
  Arrow, Explosive Shot, Arcane Shot GCD cleanup, statistics; 2026-08-06
  Explosive Shot cooldown fixed and Incendiary Ammunition removed;
  2026-09-12; 2026-10-13 Trigger Finger haste). So the declared patch
  overstates the risk for the touched modules and understates it for the
  rest: rules leaning on talents that no entry mentions (Calling the Shots,
  Volley, Windrunner's Quiver, No Scope, Black Arrow and its hero-tree
  interaction) are marked doubtful in their notes, not made candidates. No
  priority list and no checklist: the spec uses only the core Core Skills
  guide section, and its own threshold getters (active time, Calling the
  Shots, Precise Shots utilisation) have no consumer in the clone, so they
  grade nothing visible. Cast-efficiency targets still feed the core module.
- **App:** `lib/damage/wow/specs/marksmanship.ts` (Precise Shots lost;
  Trueshot's value), `ranged.ts` (`"Marksmanship Hunter"`: Trueshot window
  via `window`; Focus at the cap removed in phase 3), `tracked-cooldowns.ts`
  (Trueshot 120s, valued by `trueshotValue`; Volley 45s, unvalued),
  `procs.ts` (Lock and Load, Moonlight Chakram), `potion.ts`, generic
  checks. Case study: qpZx3mWaG7gcDdYB
  pull 3 (Shadowmeld) against 3Vz6Qt2RyTPXwpJn's Imnotanorc (100th
  percentile), both pages saved; the header of ranged.ts records what
  matched: uptime 79.6% vs 94.9%, six cancelled Steady / Aimed Shots, one
  combat potion of two (the reference missed his second too), Trueshot 88%
  overstated (Stasis), idle mostly inside movement windows (not counted).
- **Phase 3:** done 2026-10-17 (Claude Opus 5.5). All Mythic, 61
  Marksmanship player-pulls on disk:
  - top: Qenjua (6qVxPcBdCgXrkG8a fights 144 and 151, 100th on both
    Entombed Sentinels and Vashnik, fetched; Storcken beside him), Traviexx
    (LckJC7GMhQvD6rdw, 99.9th), Leevilh (baRCnPv62YQ1dJZN, 99.8th), Taewoos
    (aZ6NnwL8g9PdpGJ1, 99.7th), Tdyipce (GndQ9VFWtLzNjKpk, 99.2th), with
    Firaa and Pisslizard (ACmXHMFtaPLR9k8w), Skipcawk (Kag91qVZ2YJ7MQAb),
    Spicyh and Emoseh (mNkHXhaD6Y2tqQTg) and the other mid-table kills;
  - weaker: Teinaras (8AFnLQKdrcgawzDC, 110k/s), Marshmallon
    (dG8D9y6WxrfmtgXp), Kebah (v8bmgMAdcnBCj9Ya), Warwonka
    (hjHXmdnJFwTPpMtK), Válï and Shadhunt (LCFp3wbHvQqNP4my), Jeffshoot,
    Bechhunt, Ikkuzah, Mírsad;
  - the static's Shadowmeld: 16 pulls on seven bosses (gVDPhzp61Zm29HMw)
    and the case study.

  Talents: all 61 are Sentinel (Moonlight Chakram, Lunar Storm,
  Stargazer) with Precise Shots, Lock and Load, Trick Shots, Volley,
  Explosive Shot and Bulletstorm; nobody plays Dark Ranger (no Black Arrow
  or Wailing Arrow). Kill Shot is a choice 33 of 61 take (talent-tree entry
  135713 on all 33 pressers); the 100th-percentile Qenjua and the 99.9th
  Traviexx skip it. Built: Precise Shots lost (marksmanship.ts, ff18816),
  the Moonlight Chakram expiry (procs.ts, 0f8e205) and a value for the
  tracked Trueshot (ff18816). Removed for the user's review: Focus at the
  cap (1a8bcf7). Measured and not built: Kill Shot held, Arcane Shot
  without Precise Shots, Volley drift. Top players' GCD uptime 88–92%; the
  survey misses no Marksmanship press (only off-GCD defensives were
  unlisted), and their GCD gaps trace to cancelled Aimed Shots.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Marksmanship sets
  or adds, plus the Hunter shared rules the spec wires.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| hunter-marksmanship/AlwaysBeCasting/active-time | superseded | `checkGcdGaps` | none | idle time | Bar raised to 95 / 90 / 87.5% of the whole fight; no consumer for the getter, so nothing visible. Whole-fight denominator, forced time included. Case study: 79.6% vs 94.9%, which the app shows as small delays and gaps. Phase 3 (2026-10-17): top players' GCD uptime 88–92% (Qenjua 92% / 88%, Taewoos 90%), Kebah 80%; the survey sweep finds no unlisted Marksmanship press. Qenjua's largest Vashnik gaps (2:29, 2:49, 2.1–2.3s) are Aimed Shots begun and cancelled. |
| hunter-marksmanship/Abilities/aimed-shot-efficiency | unverifiable | — | Aimed Shot; Trueshot, Take Aim, Focused Aim, Lock and Load, Steady Shot, Moon's Blessing (all change its recharge) | Aimed Shot charges sitting full | 90% target on a haste-scaled recharge with two charges. Not tracked in tracked-cooldowns.ts (a charge ability). The reductions are server-side or hand-modelled: Trueshot speeds the recharge by a rate that is never logged, and WoWAnalyzer's own model misses a Tactical Reload constant it keeps and never reads. Time at full charges can't be rebuilt from the log. Lost casts surface as idle or Focus held, which `checkGcdGaps` and the cap check already count. Phase 3 (2026-10-17): Focus never gates it (no paid Aimed Shot under its 35 Focus on 18 player-pulls), so a missed Aimed Shot is a recharge question the log can't answer. Kept. |
| hunter-marksmanship/Abilities/rapid-fire-efficiency | unverifiable | — | Rapid Fire; Trueshot (rate), Surging Shots (random reset), Take Aim | Rapid Fire held past ready | 90% target on a fixed 16s (not haste scaled). The Surging Shots reset is guessed from a recast on cooldown, so a missed reset reads as a missed cast either way. Cooldown reductions are never logged (dps-analysis.md). Phase 3 (2026-10-17): the shortest interval between two Rapid Fires is 2.4–11.5s across the 61 (top Qenjua 3.9s, Traviexx 7.5s), so resets the log doesn't carry set it. Kept. |
| hunter-marksmanship/Abilities/trueshot-efficiency | verified | `checkCooldownDrift` (Trueshot, 120s, `trueshotValue`) + `burstGcdFindings` window | Trueshot; Calling the Shots (shortens it) | Trueshot held or skipped | 95% target, whole fight. **Overstates:** Stasis counts as ready, and the last use is expected even when the fight ends first (case study: 88% flagged at 0:03, 2:13, 4:47; ready 4:13, Stasis from 4:14.7, pressed 15.7s after, worth ~4s of Trueshot before the kill: no lost use). The 90s base plus a per-focus cut may double count Calling the Shots in WoWAnalyzer's own declaration (doubtful). The app tracks the shortest measured recast (120.3s), so a Calling the Shots player would only hide drift, never invent it. Phase 3 (2026-10-17): the tracked drift was worth 0 a use (Trueshot has no hits), so it could never fire. Now valued (`trueshotValue`, ff18816): the Moonlight Chakram each Trueshot unlocks plus its window's bonus on the player's hits (×1.06–1.23), 0.89M (Válï) to 2.87M (Qenjua) a use; `burstHold` for Vashnik's hold windows. It fires on none of the 61 (intervals 120–171s). The window check reads 0–188k (Warwonka 0:07, 11 of 14 GCDs). |
| hunter-marksmanship/Abilities/volley-efficiency | wrong | — (Volley tracked but unvalued) | Volley | Volley held | 90% target, fixed 45s, whole fight; counts forced time as ready. Whether Volley is still a baseline Marksmanship talent isn't settled by the changelog (doubtful). Phase 3 (2026-10-17): every player takes it, but the tracked Volley drift was worth 0 (its hits log as 260247, not its cast 260243), so it never fired. Valued by its hits (with Vashnik's hold windows) it read the top players as high as the weak: Heppishunt (MLy7nw8kaW1D394Y) 424k, 73s held; Storcken 361k; 期末考第二 304k; Pisslizard 227k, against Ákamé 735k, Bechhunt 419k, Uldza 346k, Shadowmeld 53–320k. Top players hold it for Trueshot (Heppishunt 3:13 → 4:38, pressed with Trueshot at 4:38) or an add wave: intervals 45–144s, top players included. Left unvalued. **Proposed `wrong`** (phase 3), for the user's review. |
| hunter-marksmanship/KillShot/kill-shot-efficiency | wrong | — | Kill Shot (off when Black Arrow is talented); Deathblow | Kill Shots skipped in the execute range | 85% of the casts the execute helper says were possible, not the whole fight (the better pattern). Value it from the log: target health on events and the Deathblow buff give the chances; a missed cast is worth a Kill Shot minus the filler it displaced, per this player's own hits. Phase 3 must show top players take nearly every one. Doubt: the helper tracks one target, so cleave counts the wrong boss; Black Arrow may replace Kill Shot at the current patch. Phase 3 (2026-10-17): a talent 33 of 61 take (entry 135713; Qenjua and Traviexx don't); no Deathblow buff in any log; 10.0s cooldown, usable under 20%. A trial check (ready while an enemy the player's aimed shots hit was under 20%, bosses only, past 1.5s a cycle, priced at Kill Shot less a Steady Shot) read the top players as high as the weak: Firaa 1.03M (Breath of Ula'tek under 20% from 4:09, first Kill Shot 4:27), Tdyipce 848k, Pisslizard 697k, Emoseh 299k, Taewoos 129k, Leevilh 66k, against Kebah 163k, Válï 139k, Mírsad 259k, Uldza 301k, Shadowmeld 2k–964k. With adds counted it was worse (Firaa 2.93M): top players leave Venom Coagulations and Vashnik's Venoms to the raid. Kill Shot also spends Precise Shots. The premise fails; not built. **Proposed `wrong`**, for the user's review. |
| hunter-marksmanship/CallingTheShots/cdr-efficacy | superseded | `checkCooldownDrift` (Trueshot) | Calling the Shots | spending Focus while Trueshot is ready | Wasted reduction means Trueshot sat ready, which the Trueshot row already counts. Getter has no consumer; the reduction is modelled (a fixed amount per Focus), not logged; forced time where Trueshot is ready counts as wasted. Talent doubtful since 11.0.5. Phase 3 (2026-10-17): no Trueshot interval under 120.0s on the 61, so no reduction shows. |
| hunter-marksmanship/PreciseShots/utilisation | verified | `preciseShotsLost` (marksmanship.ts) | Precise Shots; Windrunner's Quiver, No Scope (doubtful) | Aimed Shot cast over a live Precise Shots buff | Used ÷ (used + overwritten), under 90 / 85 / 80%; no consumer for the getter. WoWAnalyzer hard-codes the stack count it assumes (1, or 2 with a talent); the log carries the real stacks. Phase 3 (2026-10-17): Precise Shots (260242) is one stack, 15.0s, from every Aimed Shot and Rapid Fire, spent by Arcane Shot, Multi-Shot or Kill Shot (or by Rapid Fire in one build: Firaa, Pisslizard, Chazh). An Arcane Shot with it does ×1.6 (non-crit medians, 1.39–1.81 on ~20 player-pulls). Built (ff18816): an Aimed Shot landing on a held one, outside Trueshot (top players overwrite there too: Qenjua 7 of 8) and forced time, at an Arcane Shot's Focus or more, or one that ran out, loses (1 − 1/1.6) of the player's buffed Arcane Shot (31–56k). Rapid Fire over one is excused: holding it a GCD costs about as much, and top and weak do it alike (Tdyipce 7, Aaragondelta 10). Top 0–95k a pull (Traviexx, Qenjua Vashnik none; Qenjua 56k at 1:02, Taewoos 43k at 3:42); weaker Kebah 720k (23, Aimed Shot after Aimed Shot at 125 Focus: 0:28, 0:38, 1:11 …), Warwonka 746k, Válï 738k, Mírsad 489k; Shadowmeld 0–230k on his 16 pulls, 197k on the case study (0:24, 2:01, 3:09, 5:20, 6:25). |
| hunter-marksmanship/PreciseShots/arcane-multishot-without-buff | candidate | — | Precise Shots | Arcane Shot or Multi-Shot cast with no buff | "Never" a timeline flag; Multi-Shot excused only when it starts Trick Shots from cold (a 50ms check). Stricter than any priority list behind it. Phase 3 (2026-10-17), **not built, negligible**: 0–12 a pull (Ardisus 12, Válï 9; top 0–3). Unbuffed it does 39–65k against a Steady Shot's 37–42k, and the Focus it spends costs nothing (Focus never limits the spec, see the cap row). |
| hunter-marksmanship/AimedShot/cast-with-precise-shots-stacks | covered | `preciseShotsLost` (marksmanship.ts) | Precise Shots, Trueshot | Aimed Shot cast before the stacks are spent | The same event the utilisation row counts, shown as a timeline flag instead of a rate. Its Trueshot exception is coarse (any Trueshot time). Phase 3 (2026-10-17): each such Aimed Shot is a moment of the Precise Shots lost finding; Trueshot excused there too, as measured. |
| hunter-marksmanship/PreciseShots/black-arrow-without-buff | unverifiable | — | Black Arrow, Bleak Powder implied | Black Arrow cast into no buff and no new Trick Shots | Flagged unless Trick Shots turns on within half a second. Touched in the 2026-07-15 changelog, but it rests on a hero-tree interaction that may have moved (doubtful). Phase 3 (2026-10-17): no Black Arrow cast on any of the 61 player-pulls (every one is Sentinel), so it can't be measured. |
| hunter-marksmanship/WailingArrow/cast-into-deathblow | unverifiable | — | Wailing Dead (hero talent) | Wailing Arrow cast while a Deathblow proc is already up | A guaranteed proc is wasted, which loses one free Kill Shot. Log-visible (buff plus cast). Phase 3 (2026-10-17): no Wailing Arrow cast and no Deathblow buff on any of the 61 player-pulls (nobody plays Dark Ranger). |
| hunter-marksmanship/WailingArrow/cast-once-per-trueshot | unverifiable | — | Wailing Dead | a Trueshot window with no Wailing Arrow | Presence in the window, not timing. Statistic counter only in WoWAnalyzer. Phase 3 (2026-10-17): no Wailing Arrow on any of the 61. The Sentinel counterpart, a Trueshot whose Moonlight Chakram went unused, is built (Chakram row). |
| hunter-shared/CancelledCasts/cancelled-pct | covered | `checkInterrupts` | none | a cast cut by movement | Completed share under 97.5 / 95 / 90%. Aimed Shot is the main cast. No forced-phase handling. Case study: six cancelled Steady / Aimed Shots, the ~2s gaps. Phase 3 (2026-10-17): fires on the top players too (Taewoos 7, Storcken 6; Qenjua's two cancelled Aimed Shots on Vashnik are his largest gaps), valued in the gaps. |
| hunter-shared/FocusTracker/percent-at-cap and FocusDetails/generator-waste | wrong | — (`primaryResourceCapFindings` removed for the spec, 1a8bcf7) | none | Focus generated into a full bar | At or under 5 / 10 / 15% of the fight at cap; wasted generator Focus 5 / 10 / 15%. Counts forced time. The spec itself hides the generator-waste tile because Focus isn't a rotation constraint for Marksmanship, so a cap finding here deserves skepticism. Phase 3 (2026-10-17): the app's cap check read 0.15–2.0M on the top players (Firaa 2.04M, Leevilh 1.58M, Qenjua 1.13M on Vashnik, Taewoos 935k), as on the weaker (Shadhunt 6.07M, Teinaras 1.48M), mostly Rapid Fire pressed at full Focus, priced at ~10k a point from Aimed Shot. Focus never limits the spec: on 18 player-pulls 22–50% of casts are at the 125 cap, no Steady Shot under 40 Focus, no paid Aimed Shot under its 35. Focus lost at the cap costs no spender. **Removed; proposed `wrong`**, for the user's review (as Frost DK's Runic Power cap). |
| hunter-shared/FocusCapTracker/natural-regen-waste | unverifiable | — | none | Focus at the cap with regen running | Regen lost at the cap is a model (5 a second, scaling with haste, cap fixed at 100). The log shows only casts made at the cap (dps-analysis.md). Phase 3 (2026-10-17): the cap is 125 on every player, and Focus is never short (cap row), so the regen lost costs nothing either. |
| hunter-shared/SentinelsMark/mark-outcome-grade | unverifiable | — | Sentinel (hero talent); Moon's Blessing | a mark that expires, is refreshed or dies unconsumed | Consumed by a hit is good; older than 11.7s is expired. Blind to forced phases (the code comment itself names one) and to cleave, where marks land on unreachable targets. Phase 3 (2026-10-17): all 61 are Sentinel, but no Sentinel mark appears in the enemy debuff stream (the players' debuffs there are Explosive Shot, Master Marksman, Rapid Fire, Sanctified Armaments, Rune of Lingering, Hunter's Mark). Nothing to measure. |
| hunter-shared/MoonlightChakram/use-grade | verified | `checkProcs` (Moonlight Chakram, procs.ts) | Moonlight Chakram; Stalk and Strike | no Chakram after Trueshot, or a low-hit cast | Fails under 4 hits; the Lock and Load half is hard-coded. Phase 3 (2026-10-17): each Trueshot grants a 17s buff (1264946) that is the only way to press the Chakram (1264949, hits 1266081: 0.3–1.4M a press). Built (0f8e205): the buff running out is a Chakram lost, a whole press. 11 on the 61: Storcken 2:25 (1.14M), Teinaras 0:21, Válï ×2, Shadhunt, 丶郑兮, Aaragondelta, Pazsmilkies ×2, 非常人贩, Braktixx; none on the 99th-percentile and better. The hit-count half grades nothing: 155 of 164 casts hit 7 times whatever the target count (the rest at a death or the kill). |
| hunter-marksmanship/statistics | no-damage | — | — | — | Display only: average Aimed Shots per Trueshot, Precise Shots damage added, Lock and Load proc luck (a binomial chart), Surging Shots resets, Calling the Shots seconds, Kill Shot execute damage, Wailing Arrow counts, Deathblow procs and wasted ones, Binding Shot, Black Arrow and Master Marksman damage, Trueshot damage, Focus charts. |
| hunter-shared/utility | no-damage | — | — | — | Aspect of the Turtle, Exhilaration, Survival of the Fittest, Camouflage, Disengage, Counter Shot, Misdirection, Binding Shot, Tranquilizing Shot, traps, Flare, Intimidation, Mend Pet, Feign Death filter. Utility and defensives aren't judged. |

Not rules (models the rules above rest on): the Aimed Shot pre-pull
normalizer (fabricates a begin-cast for a cast begun before the pull), the
GlobalCooldown override (Rapid Fire's fabricated channel GCD skipped, Aimed
Shot given no GCD without a real begin-cast), the SpellUsable override for
Surging Shots, the Lock and Load free-Aimed-Shot Focus cost, the Feign Death
filter on deaths, the Focus tracker and its fabricated-cast filter, buff
timeline highlights, the Trigger Finger haste term, Rapid Fire tick counts
(stored for debug, read by no rule). Spec constants (Trueshot recharge
rates, Lone Wolf, Streamline, Steady Focus, Careful Aim, Eagletalon's,
Serpent Sting): table, not extracted; several are read by no module and are
legacy.

Procs (phase 3, 2026-10-17): Lock and Load (procs.ts, 15s) fires on 4
pulls of 61 (Shadowmeld Ula'tek 3:28, 357k; Braktixx 4:38; Ericjunior
0:59 and Shadowmeld Entombed Sentinels Pull 3 0:58 in Stasis), none on
the top players. Precise Shots is valued by
`preciseShotsLost` above, not `checkProcs` (it empowers an Arcane Shot).

## Candidates left

Phase 3 (2026-10-17) worked the list:

1. **PreciseShots/utilisation**: built (Precise Shots lost).
2. **KillShot/kill-shot-efficiency**: premise failed (top players hold it
   as much as weak ones); proposed `wrong`.
3. **Arcane / Multi-Shot without the buff**: negligible, left a candidate.
4. **Wailing Arrow rows**, **Black Arrow**, **Sentinel's Mark**: no
   sample player has them in the log, `unverifiable`. **Moonlight
   Chakram**: built (the expiry in procs.ts).
