# WoWAnalyzer audit: Devourer Demon Hunter

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Demon Hunter shared layer,
  then the spec), spot-checked at their source lines (4 of
  4 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares patch 12.0.0 against the clone's retail 12.1.0, so it
  is **lagging**; partly maintained (a "maintained, partial" flag). Last
  change 2026-03-20, a disclaimer. 21 modules in the list, 19 owned by the
  spec; no priority list. The changelog gives no patch per module, so
  every rule is 12.0.0 as declared. **The spec's own disclaimer says its
  Reap, Cull and Eradicate logging is bugged and the analysis resting on
  it "should be ignored".** Rules that lean on Reap or Cull are doubtful
  for that reason, and every talent-dependent rule (Moment of Craving,
  Second Helping, Soul Glutton, Scythe's Embrace, Hungering Slash,
  Umbral Blade) may have changed since 12.0.0; none is made a candidate on
  the strength of its text alone. The Demon Hunter class rules (Sigil of
  Flame, Immolation Aura, Demonsurge) are not enabled for this spec; only
  Felblade's spellbook entry is inherited.
- **App:** `lib/damage/wow/specs/ranged.ts` has `"Devourer Demon Hunter":
  []`: no spec check at all, only the generic ones (`checkGcdGaps`,
  `checkInterrupts`, `checkDeaths`, `combatPotion`). The header of
  ranged.ts says Devourer has no main-cooldown window or resource check
  and had 2 sample players (unverified). `tracked-cooldowns.ts` tracks one
  cooldown, The Hunt (91s, also unverified, 2 players). **No case study**
  has been made on a Devourer.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Devourer sets or
  adds.
- **Phase 3:** not started.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| demonhunter-devourer/ActiveTime/guide-grade | superseded | `checkGcdGaps` | none | idle time | Perfect at no downtime, then 5 / 10 / 15% of the whole fight. The spec's own looser thresholds appear not to be read by the guide (my inference from two getter names). Counts forced downtime as idle. |
| demonhunter-devourer/VoidMetamorphosis/per-cast-active-time | wrong | `checkGcdGaps` | Void Metamorphosis | idle during the transformation | Share of each window spent casting, perfect at 98%, good 95%, ok 90%. The same idle the gap check counts, graded a second time; forced time inside a window counts as idle. A window already open at the pull would break its end-of-window code. The window itself may still matter: see candidates. |
| demonhunter-devourer/VoidMetamorphosis/per-cast-cull-count | candidate | — | Void Metamorphosis; Moment of Craving, Second Helping, Umbral Blade, Void Ray | fewer Cull casts in a window than the estimate | Expected count is window length over Reap's recharge, plus a cast per Void Ray when Moment of Craving is taken, plus one for a second charge; fail more than 4 short. **Doubtful:** the Cull logging disclaimer, hard-coded 8s and 16s durations, haste read at one moment, and resets that may have changed after 12.0.0. Would be valued as missing Cull casts times the player's average Cull in the window. Phase 3: top players' Cull counts per window against the estimate; a mistake must show fewer casts with idle GCDs spent on something weaker, not casts displaced by Void Ray or movement. |
| demonhunter-devourer/VoidMetamorphosis/per-cast-smuggled-toll | candidate | — | Hungering Slash, Voidblade, The Hunt | entering the transformation without the Reaper's Toll buff up | Pressing Voidblade or The Hunt just before entering converts it, giving a third Toll instead of two. Two-level, log-visible (buff at the cast). **Doubtful:** Hungering Slash and the Toll mechanic may have changed since 12.0.0, and a first cast where it couldn't be done reads Fail. Value: one extra Reaper's Toll hit. Phase 3: how many top players smuggle every cast; if most do not, it is a build-dependent habit. |
| demonhunter-devourer/VoidMetamorphosis/per-cast-rollup | superseded | — | as the items | — | Average of its items' marks. Inherits their doubts. |
| demonhunter-devourer/Reap/soul-gating-cast | unverifiable | — | Soul Glutton, Scythe's Embrace, Moment of Craving | Reap cast with souls to spare, or too few gained | Without Scythe's Embrace, Reap is a soul top-up for entering the transformation (entry cost, per-cast capacity and a 4-short band are hard-coded); with it, only a cast-efficiency bar. The spec's own disclaimer says Reap logging is bugged, and pre-pull souls aren't handled. Indirect at best (a delayed transformation). |
| demonhunter-devourer/VoidRay/full-channel | candidate | — | Void Ray (Final Breath, Moment of Craving, Eradicate, Voidfall pay out at the end) | a Void Ray cut before its last ticks | Good at 19 of 21 ticks landed. **Hard-coded** tick count and a 3.2s link window; a target dying or going untargetable would read Fail. Not covered by `checkInterrupts` unless it counts a channel broken early (unchecked). Value: lost ticks at the cast's own damage per tick, plus the end payout. Phase 3: read the actual tick count from the log rather than 21; separate a broken channel from forced movement or an untargetable boss. |
| demonhunter-devourer/Voidstep/consumed-rate | candidate | — | Hungering Slash, Vengeful Retreat | a Voidstep proc not spent on a Vengeful Retreat | Perfect at 100%, good 90%, ok 75%. Forced movement and mechanics that prevent a retreat aren't handled. The damage value of the free retreat is unclear: **expected value is low** unless a log shows the follow-up hit. |
| demonhunter-devourer/Voidstep/expired-rate | superseded | — | Hungering Slash | — | The unused slice of the same procs as consumed-rate (perfect only at 0%, fail above 25%). |
| demonhunter-devourer/Voidstep/overwritten-rate | superseded | — | Hungering Slash | — | The refreshed-before-use slice of the same procs. |
| demonhunter-devourer/FuryTracker/time-at-cap | candidate | — | none | Fury at the cap | Defined but nothing in the guide reads it (dead code). Perfect up to 15% of the fight at cap, a generous bar that probably reflects pooling. The app's `primaryResourceCapFindings` isn't wired for Devourer and Fury is not in its list; whether the log carries Fury events here is unchecked. Value: Fury generated into a full bar. Phase 3: waste by top players. |
| demonhunter-devourer/FuryDetails/waste-share | superseded | — | none | — | Wasted over generated, 15 / 20 / 25%; a getter with no caller. Same loss as the cap row. |
| demonhunter-devourer/Abilities/the-hunt-efficiency | covered | `checkCooldownDrift` (The Hunt, 91s) | The Hunt; Violent Transformation (entering the transformation resets Voidblade and The Hunt) | The Hunt held | WoWAnalyzer sets no target for it, only a cooldown category. Tracked in the app (unverified, 2 players; shortest 91.6s, median 105.6s). The reset only shortens real intervals, so using the shortest erring lenient is right. Forced time counts as ready in WoWAnalyzer. |
| demonhunter-devourer/Abilities/reap-cull-efficiency | candidate | — | Second Helping (extra charge), Umbral Blade (haste-scaled recharge); Mass Acceleration and Moment of Craving reset it | Reap or Cull held | No target set; only a bar when Scythe's Embrace is taken. Not tracked in the app. A short recharge spreads too far for the fixed-interval check because the two resets are not a fixed amount: they would need a custom model, not `spentCooldownDrift`'s per-event reduction. GCD-bound, and the Reap/Cull disclaimer applies. **Very low expected value.** |
| demonhunter-devourer/Abilities/felblade-cast-efficiency | unverifiable | — | Felblade | Felblade held | 95% target, class layer. A source comment admits Demon Bite's reset can't be seen in events, so held time can't be told from a reset. Fury builder; indirect. |
| demonhunter-devourer/Abilities/spellbook-no-target | no-damage | — | — | — | Voidblade (30s), Vengeful Retreat (25s), Void Metamorphosis (none declared), Shift, Collapsing Star and the other spellbook entries have no efficiency target. Arcane Torrent's efficiency is switched off (no throughput). |
| demonhunter-devourer/Blur/mitigation-model | no-damage | — | Demonic Resilience | — | Blur as 25% reduction in the major-defensive framework. |
| demonhunter-devourer/statistics | no-damage | — | — | — | Display only: Fury wasted and Fury usage tab, Fury graph, transformation uptime bar, damage done while transformed, core Channeling and aura statistics. |
| demonhunter-shared/utility | no-damage | — | — | — | Glide, Disrupt, Torment, Spectral Sight, Chaos Nova, Consume Magic, Sigil of Misery, Darkness, Blur. Utility and defensives aren't judged. |

Not rules (models the rules above rest on): the Void Metamorphosis
normalizer that fabricates a cast from the buff (its comment dates it to
the 12.0.0 prepatch; may be stale), the Void Ray event link, the Fury
tracker and graph, the Collapsing Star stand-in (a temporary registration
as a spender), the Cull module (a stub that does nothing), the cooldown
reset models (Mass Acceleration, Moment of Craving, Violent
Transformation), the Preparation section and the Defensives shell. The
class-layer rules (Sigil of Flame, Immolation Aura, Demonsurge) are not
enabled for Devourer.

## Candidates left

All are doubtful until the 12.1.0 talent text is checked; most will fail
phase 3.

- **Void Metamorphosis window** (derived, not a WoWAnalyzer rule): the
  app has no main-cooldown window for Devourer, and the transformation
  is the spec's burst. `burstGcdFindings` on its buff, with the bonus
  read from the hits, would value idle GCDs inside it without the
  double count that makes per-cast-active-time wrong. Check first
  whether the damage inside the buff differs enough from outside to
  read a bonus.
- **Fury at the cap**: if the log carries Fury, wire the existing cap
  check; value the Fury wasted.
- **Void Ray full-channel**: lost ticks and end payouts, using the real
  tick count.
- **Smuggled Reaper's Toll**: one extra Toll hit; only if top players do
  it nearly always.
- **Cull count per window**: weakened by the logging disclaimer.
- **Voidstep consumed-rate** and **Reap/Cull efficiency**: lowest value.
