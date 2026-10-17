# WoWAnalyzer audit: Affliction Warlock

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Warlock shared layer,
  then the spec), spot-checked at their source lines (3 of
  3 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares 12.1.0, "maintained partial" (its own description warns
  the tool may give strange suggestions); last change 2026-08-15 (Dark
  Harvest guide, Haunt bonus). No priority list and no checklist: every
  grade is a guide section (Always Be Casting, DoT uptimes, Unstable
  Affliction, Cooldown Usage, Dark Harvest, Defensives, Resource Use,
  Preparation). Three leftover suggestion getters (Haunt, Drain Soul, active
  time) are read by nothing in the spec folder.
- **App:** `lib/damage/wow/specs/ranged.ts` (`"Affliction Warlock"`:
  Malevolence window, Agony, Unstable Affliction and Wither / Corruption
  uptime), `lib/damage/wow/specs/affliction.ts` (phase 3: Haunt dropped),
  `procs.ts` (Nightfall), `tracked-cooldowns.ts` (Malevolence 60s, Summon Darkglare 120s),
  `potion.ts`, generic checks. Soul Shards are logged on spenders only, so
  no shard check. **No case study:** the spec was sampled with six players
  for the survey (spell-data.ts) and never compared with a WoWAnalyzer page,
  so nothing here is `verified`.
- **Phase 3:** done 2026-10-17 (Claude Opus 5.5). All Mythic. Fetched
  eight single fights (~20 WCL points each, ~330 points with rankings and
  one probe): the top parses 9rGDw4WB3bv6VmnK fight 37 (大哥别读条了,
  Vashnik, 100th), Kag91qVZ2YJ7MQAb fight 45 (Zachx, Vashnik, 98.9th),
  tcdpmV7MBHK1jGYk fight 22 (Weeblock, Vashnik, 96.6th),
  6kHtGaQXCMWYxFpZ fight 14 (Focusino, Entombed Sentinels, 100th),
  NvX17Tb9yMY8QrDf fight 17 (Weeblock, Entombed Sentinels, 99.2nd); the
  weaker 7B1wQbjNhgXJDaHC fight 30 (八十參, 16.9th), a4kX1DNT27yHGvqJ
  fight 47 (Fluffalicous 18th, with Pigson), ZjVtM1vFcrp7w3WC fight 34
  (Næliel, 20th), all Vashnik. On disk already: the static's Wyrmtongues,
  9 wipes on Kith'ix, Nek'zali, Ula'tek and Vashnik (gVDPhzp61Zm29HMw).
  18 player-pulls in all. Scripts: `sampledata/wow/_scratch/aff-*.js`.
  - **Talents** (from casts, buffs and hits): everyone takes Haunt, Dark
    Harvest, Unstable Affliction, Summon Darkglare and Nightfall. Six are
    Hellcaller (Wither, Malevolence): Wyrmtongues, Zachx, Weeblock,
    Focusino, Næliel. Four are Soul Harvester (Corruption, Succulent Soul,
    Demonic Soul): 大哥别读条了, 八十參, Fluffalicous, Pigson. 八十參 and
    Fluffalicous fill with Drain Soul, the rest with Shadow Bolt. Every
    player has a demon out, so nobody takes Grimoire of Sacrifice.
  - **Built:** Haunt dropped (`hauntDropped`, affliction.ts); the
    Nightfall expiry (procs.ts); Drain Soul as an on-GCD channel (game.ts:
    it was missing from the spell survey, so Fluffalicous's channels read
    as 57% GCD uptime and 25.3M in gaps; now 74%).
  - **Not built, negligible:** Dark Harvest held, its DoT coverage, Cull
    the Weak. Grimoire of Sacrifice: nobody takes it.
  - The two `wrong` rows stay `wrong`, with the log evidence in their notes.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Affliction sets or
  adds.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| warlock-affliction/AlwaysBeCasting/active-time-grade | superseded | `checkGcdGaps` | none | idle time | Perfect only at zero downtime, Good to 5%, Ok to 10%, else Fail, over the whole fight with forced time counted as idle. The app values each gap less forced time. Phase 3: Drain Soul's channels had read as idle (missing from the spell survey); fixed in game.ts. |
| warlock-affliction/AlwaysBeCasting/threshold-override | no-damage | — | none | — | Looser 10 / 15 / 20% thresholds under a suggestion name that nothing reads (the guide grade uses the core getter). Dead code; see Not rules. |
| warlock-affliction/CancelledCasts/cancel-rate-grade | covered | `checkInterrupts` | none | a cast cut by movement | Perfect to 1%, Good to 5%, Ok to 10% of casts. Counts boss interrupts and stuns as player cancels; the app counts the idle instead of a rate. Phase 3: "Cancelled casts" fires on 17 of the 18 player-pulls (top 5–17 a pull, Pigson 25, mostly Shadow Bolts and Seeds). |
| warlock-affliction/Agony/uptime-grade | covered | `dotUptimeFindings` (Agony) | none | Agony left off | Downtime 1 / 5 / 10% of the whole fight, pooled over enemies, forced time counted. The app measures from first application, less forced time. Agony is also the main shard source, which the app doesn't value. Phase 3: fires on WoW (大哥别读条了 518k at 3:23 and 6:01; Wyrmtongues Ula'tek Pull 1 1.02M at 3:28 and 7:17). |
| warlock-affliction/Corruption/uptime-grade | covered | `dotUptimeFindings` (Wither / Corruption) | Wither switches the tracked debuff | Corruption or Wither left off | Same 1 / 5 / 10% steps. The app watches both ids as one DoT. Phase 3: never fired on the 18 player-pulls (Wither and Corruption stay on some enemy all pull); it is the same `dotUptimeFindings` that fires for Agony and Unstable Affliction. |
| warlock-affliction/UnstableAffliction/uptime-grade | covered | `dotUptimeFindings` (Unstable Affliction) | Unstable Affliction | Unstable Affliction left off | Much looser: downtime 10 / 20 / 30%. The guide itself says low uptime is right on 2+ targets, where Seed of Corruption replaces it; the app has no target-count test, so on cleave this check may over-flag. Survey note: one Affliction let it drop 9-13s on Ula'tek and Vashnik, unreviewed. Phase 3: fires on top and weak players alike: top 0–0.45M a pull (Zachx 452k, 4:08 5.0s; Weeblock 361k at 1:55; Focusino none), weaker 0.13–0.72M (Næliel 723k), Wyrmtongues up to 5.95M on Ula'tek Pull 1. Unstable Affliction is a Soul Shard spender recast every ~3s whose ticks decay after each cast, so a gap could be shard starvation; but the cast that ends a gap usually had 3–5 shards banked (Weeblock 1:55: 5; Næliel 0:37: 4, 5:15: 3), so these are delays. Not changed. |
| warlock-affliction/Haunt/uptime-grade | verified | `hauntDropped` (affliction.ts) | Haunt | Haunt left off | Downtime 1 / 5 / 10%, but Haunt has a 15s cooldown and resets on add deaths, so full uptime may be unreachable. Phase 3 (2026-10-17) **built Haunt dropped**. Haunt (48181) lasts 18.0s on a ~15.5s cooldown; the top players recast it as it runs out (median 16.1–18.3s), so each second with Haunt on no enemy pushes every later Haunt back: lost = gap ÷ the player's cadence × (Haunt's hit 103–191k − what its cast time would have done with Shadow Bolt or Drain Soul, 31–74k). The damage-taken bonus isn't counted: read from the log it is +1% (Corruption ticks), +6% (Wither), +0.5% (Blackened Soul) in the 5s after a re-application against the 5s before, far under the amplifier the fan-out quoted. Gaps less forced time and movement; a gap with 2+ Seeds of Corruption (AoE) isn't counted. Measured: top Weeblock none (both kills), Focusino 33k, 大哥别读条了 32k (4 Seed gaps excused), Zachx 49k (3:20, 6.9s); weaker Pigson 48k, 八十參 57k, Fluffalicous 161k, Næliel 189k (8 gaps, 4:55–5:02 the longest); Wyrmtongues 20–231k on Vashnik (Pull 4: 2:13–2:24, 3:18–3:27) and 455k on Ula'tek Pull 1 (7:04–7:38 on the adds). |
| warlock-affliction/Haunt/suggestion-thresholds | no-damage | — | Haunt | — | Dead getter (90 / 85 / 75% uptime), rendered nowhere. |
| warlock-affliction/Abilities/haunt-cast-efficiency | wrong | — | Haunt | Haunt cast less than once per 15s | 95% target over the whole fight. Resets on add deaths aren't modelled (the source says so), and forced time counts as ready. Not tracked in tracked-cooldowns.ts either; a Haunt reset has no reduction event to read. Phase 3 re-check (2026-10-17), **stays `wrong`**: the premise (press it on cooldown) fails on the top players. The debuff lasts 18.0s against a ~15.5s cooldown (shortest interval 15.4–15.6s), and they recast it as it runs out, every 16.1–18.3s (median): Focusino (100th, 96.9% Haunt uptime) has it on cooldown 88% of the pull (18 casts in 5:18), Zachx 90%. The real loss, Haunt left off, is `hauntDropped` (row above). |
| warlock-affliction/Abilities/darkglare-cast-efficiency | covered | `checkCooldownDrift` (Summon Darkglare, 120s) | Summon Darkglare | Darkglare held | 90% target, whole-fight, forced time counted as ready. The app measured 120.0s shortest and 123.2s median across the survey. WoWAnalyzer models no reduction. Phase 3: no drift finding on the 18 player-pulls; nobody lost a whole use (3 Darkglares in every 4:53–6:44 kill, Fluffalicous 4 in 6:19). The drift check itself fires on WoW for other specs. |
| warlock-affliction/Abilities/dark-harvest-cast-efficiency | candidate | — | Dark Harvest; Cull the Weak | Dark Harvest held | Core default target; 60s cooldown. Not tracked: Cull the Weak takes 1.5s off per Unstable Affliction or Seed of Corruption cast, so its intervals spread. Fit for `spentCooldownDrift` with a fixed reduction per cast (`reduceOn`) and a pre-pull cast read from the buff, plus `valuePerUse` from the channel damage. Phase 3 (2026-10-17), **not built, negligible**. Dark Harvest (1257052; hits 1257065) is a flat 60.0s for every Hellcaller (shortest interval 60.0–60.5s with 15–24 Unstable Afflictions and Seeds between: no per-cast cut shows). Soul Harvesters run 41–54s with no fit to a cut per cast. A press's hits are added damage (the DoTs on its targets tick no lower in the 8s after it), 0.3–0.4M on one enemy, ~1M on 2–3. The Vashnik top players hold it ~84s for the Venoms after each Imbibe, which the fight context's hold windows already excuse. Held time past 3s a cycle, outside forced and hold time, with a hold ending in a press on 2+ enemies excused up to its break-even: top 6–28k a pull (Weeblock Entombed Sentinels 1:04–1:14), weaker none, Wyrmtongues 0–123k (Ula'tek 3:21–3:49). Script: `_scratch/aff-dh.js`, `aff-dhtgt.js`. |
| warlock-affliction/Abilities/malevolence | covered | `checkCooldownDrift` (Malevolence, 60s) and the window check | Malevolence | Malevolence held, idle inside it | WoWAnalyzer lists it with no target and no window rule. The app tracks it (60.0s, matching the Destruction check against a WoWAnalyzer page) and `burstGcdFindings` grades GCDs inside the window. Phase 3: the window check fires on WoW (Wyrmtongues Kith'ix Pull 2 0:10, 40 of 46 GCDs, 254k); no drift finding on any of the 14 Hellcaller player-pulls. |
| warlock-affliction/CullTheWeak/cdr-efficiency | candidate | — | Cull the Weak; Dark Harvest | Dark Harvest held so reductions land on a ready cooldown | Same reduction rule seen from the other end: share of the 1.5s reductions that shortened a cooldown still running, at least 90% Perfect, 75% Good, 50% Ok. This is Dark Harvest's drift measured another way and is subsumed if the cast-efficiency candidate is built; do not build both. The reduction is modelled in the tool, not logged. Phase 3 (2026-10-17), **not built**: the reduction doesn't show in the log (see the Dark Harvest row: Hellcallers sit at a flat 60.0s whatever the cast count, Soul Harvesters' 41–54s don't follow the count), and Dark Harvest holds are negligible anyway. |
| warlock-affliction/DarkHarvest/dot-coverage-per-cast | candidate | — | Dark Harvest; Wither, Unstable Affliction, Haunt | Dark Harvest cast with a DoT missing on a struck target | Each cast graded by its worst-covered target (Agony, Corruption or Wither, Unstable Affliction only on single target). Log-visible from damage and debuff events. Value it as the damage the channel consumes from missing DoTs; what separates a mistake from top play is whether top players cast it on a short DoT to avoid holding the cooldown. Phase 3 (2026-10-17), **not built, negligible**: the channel's damage on a target barely depends on its DoTs. Missing Agony or Wither changes nothing (Weeblock Vashnik 4:38: 300k on a Burning Venom with Agony alone against 288–339k with both; Wyrmtongues Vashnik Pull 4 1:03: 296k with Wither alone). Unstable Affliction is a one-target DoT, so the adds never carry it, top players included; its absence reads ~15–25% lower per target. Script: `_scratch/aff-dhcov.js`. |
| warlock-affliction/DarkHarvest/empty-cast | wrong | — | Dark Harvest | cast striking no enemy | Automatic Fail when no channel damage lands within 3s of the cast. An untargetable boss or a dead target makes it Fail with no player fault, and the 3s bound ignores haste. Phase 3 re-check (2026-10-17), **stays `wrong`, unverified either way**: 0 of 101 Dark Harvests struck nothing on the 18 player-pulls, so the rule never fires in the samples and its premise can't be tested. Some casts hit Shrouded Venoms for 0 (immune adds) beside a real target. |
| warlock-affliction/DrainSoul/shards-sniped | unverifiable | — | Drain Soul | adds killed outside Drain Soul | Shards per add kill, inferred from resource events; the kill attribution is a guess and the getter is rendered nowhere. Shards aren't logged on generators. Phase 3: Drain Soul (198590) was missing from the spell survey, so its channels read as idle; game.ts now treats it as an on-GCD channel. |
| warlock-shared/SoulShardDetails/shards-wasted-per-minute | unverifiable | — | none | generators cast at or near five shards | Wasted shards per minute of the whole fight. Soul Shards appear in the log only on spenders, so waste at the cap can't be seen (ranged.ts header). |
| warlock-shared/GrimoireOfSacrifice/buff-uptime | candidate | — | Grimoire of Sacrifice | pet summoned, or buff down | Buff uptime under 95 / 90 / 85% of the fight. The buff is in the log. Low value: it is a death or resummon, which `checkDeaths` already values; build only if a page shows a resummon. Phase 3 (2026-10-17), **not built**: nobody in the 18 player-pulls takes it (no buff; every player's demon deals damage). |
| warlock-shared/defensives-and-utility | no-damage | — | Dark Pact, Unending Resolve, Frequent Donor, Dark Accord | — | Dark Pact (60% cast target), Unending Resolve (33%), the Healthstone grade, Demonic Circle, Fel Domination, Soulburn, Mortal Coil, Shadowfury, Howl of Terror, Soulwell, Gateway, Singe Magic. Defensives and utility aren't judged. |
| warlock-affliction/statistics | no-damage | — | — | — | Display only: Darkglare pet damage and average DoTs at cast, Dark Harvest damage and share, Cull the Weak wasted seconds, Absolute Corruption, Siphon Life and Haunt bonus damage, Drain Soul damage, Nightfall wasted procs, DoT uptime bars, active-time gauge, the Cooldown Usage graph, Resource Use and Preparation text. Phase 3: "Nightfall wasted procs" hides a damage effect, so Nightfall (264571, 12s, stacks to 2) is now in procs.ts and `checkProcs` reports its expiries: Wyrmtongues 12 in 9 pulls (3 in forced time), Fluffalicous 2, Pigson 1, Zachx 1 (2:03), the other top players none. Valued at a whole consumer press, an upper bound: it empowers the press (Shadow Bolt 45–101k with it vs 37–59k without). |

Not rules (models the rules above rest on): the shard tracker, the Grimoire
of Sacrifice and pre-pull DoT normalizers, the channel normalizer, the
global-cooldown override for Drain Soul, the Cooldown Throughput 20s
Darkglare window, Dark Harvest damage-to-cast matching, enemy debuff history,
and UnstableAfflictionEfficiency (records whether each Unstable Affliction
was removed early; nothing displays or grades it). Dead code: the duration
table with a Creeping Death reduction is imported by nothing, and the
Haunt, Drain Soul and active-time suggestion getters are unread.

## Candidates left

Phase 3 (2026-10-17) worked all four; none is left to build:
- **Dark Harvest cast efficiency (with Cull the Weak):** not built,
  negligible (top 6–28k a pull, worst weak pull 123k). No per-cast cut
  shows in the log.
- **Haunt uptime:** built as Haunt dropped (affliction.ts), valued by the
  Haunts lost rather than the damage-taken bonus, which reads only 1–6%
  in the log.
- **Dark Harvest DoT coverage:** not built, negligible: the channel does
  the same damage on a target missing Agony or Wither.
- **Grimoire of Sacrifice uptime:** not built, nobody takes it.

Open, not an audit row: the 100th-percentile Soul Harvester
(大哥别读条了) spends long stretches on Seed of Corruption with Haunt and
Unstable Affliction down. Seed gaps are excused from Haunt dropped, but
the shared Unstable Affliction uptime check still counts them (423k on
that kill). Whether one-target DoT uptime should be judged during Seed
AoE stretches needs a cleave-aware rule.
