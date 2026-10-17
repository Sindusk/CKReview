# WoWAnalyzer audit: Destruction Warlock

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Warlock shared layer,
  then the spec), spot-checked at their source lines (4 of
  4 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares 12.1.0, fully maintained; last change 2026-09-25
  (Backdraft reworked from grading the consuming spell to counting waste).
  No priority list and no checklist: every grade is a guide section (Core:
  DoT uptime and cooldown usage; Rotation: Backdraft and Havoc; Defensives;
  Resource usage; Preparation). 11 spec records plus 5 from the Warlock
  class layer.
- **App:** `lib/damage/wow/specs/ranged.ts` (`"Destruction Warlock"`:
  Malevolence window, Wither uptime, Backdraft waste, Havoc on the main
  target), `tracked-cooldowns.ts` (Summon Infernal, Malevolence, Soul Fire),
  `potion.ts`, generic checks. Case study: qpZx3mWaG7gcDdYB pull 3
  (Wyrmtongues, 29.9% against 47.1%) against the two top Destruction
  Warlocks of NK1hBtW9rckdjq36; the page was compared and the headers of
  ranged.ts and tracked-cooldowns.ts record what matched. One player in the
  samples, so the spec's checks are marked unverified there.
- **Phase 3:** not started.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Destruction sets
  or adds. The class layer (Dark Pact, Unending Resolve, Healthstone,
  Grimoire of Sacrifice, shard rate) is judged here too, because only this
  spec's ledger knows what the app does with it.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| warlock-destruction/Immolate/dot-uptime-grade | covered | `dotUptimeFindings` (Wither) | Wither | main DoT off every enemy | Rated by downtime: 1 / 5 / 10% (uptime 99 / 95 / 90%), over the whole fight, pooled over enemies. Stasis and untargetable time count as downtime, and time before the first application too; the app measures from the first application, less forced time. The app's entry names Wither only; the Immolate build is the next row. |
| warlock-destruction/Immolate/uptime-without-wither | candidate | — | none (no Wither) | Immolate off every enemy | The same rule for a player who didn't take Wither. The app's Destruction entry has no Immolate DoT, so those players get no DoT finding at all. See Candidates left. |
| warlock-destruction/Backdraft/wasted-stacks-count | covered | `backdraft` (`castTimeProcFindings`) | Backdraft | a Conflagrate into two stacks; stacks left to expire | Same two kinds of waste. The app prices a stack as the cast time it would have saved, measured from the player's own begin-casts, times their damage per GCD-second, and skips forced time. Ids and the two-stack maximum came from pull 3, but the Backdraft grade was not compared against the page (WoWAnalyzer rewrote it after the case study was planned), so this stays covered, not verified. WoWAnalyzer counts a stack expiring in a no-cast phase as waste with no forgiveness, and starts its tracker at zero for stacks gained before the pull. |
| warlock-destruction/Backdraft/waste-rate-threshold | superseded | `backdraft` | Backdraft | — | A per-minute grade (1 / 1.5 / 2) on the same count. Nothing in the spec folder reads it. The count row above is the live one. |
| warlock-destruction/HavocGuide/window-shard-spend-grade | wrong | — | Havoc; Improved Havoc (20s window) | a Havoc window with few spenders | Grades shards spent per Havoc window against a full-window bar (10 for 15s, 14 for 20s; fails below 6 or 9). Spenders are counted by cast, so it is idle and movement inside the window graded a second time; `checkGcdGaps` already counts that idle. It also counts forced movement and an untargetable boss as castable, counts a free Shadowburn as a paid shard, and credits the player's own casts only on a cleave window. The app instead values the Havoc target choice itself (below). |
| warlock-destruction/HavocGuide/execute-burn-grade | wrong | — | Shadowburn; Havoc | an execute-range window with few Shadowburns | The same window rule counted in Shadowburns when the target is at or below 20% health (9 or 12 for Perfect). Window-graded cast count, so it double-counts idle. Its execute flag reads health from the last damage event on the target and can be stale. |
| warlock-destruction/HavocGuide/target-death-prorating | superseded | — | Havoc | a shortened window | Scales the two window bars down when the target dies. A correction to the two rows above, which are already `wrong`. |
| warlock-destruction/HavocGuide/shards-banked-advice | unverifiable | — | Havoc | Havoc cast with under 3 shards | Advisory text, never changes a rating. The app's header says Soul Shards are logged on spenders only, so the banked count at the cast isn't in the log; WoWAnalyzer's own model re-derives it by heuristic. Not measured here. |
| warlock-destruction/HavocGuide/shadowburn-proc-feedback | no-damage | — | Shadowburn; Fiendish Cruelty | — | Praise text only, no grade. It assumes any Shadowburn outside execute range is a free proc cast. |
| warlock-destruction/HavocGuide/low-cast-count-note | no-damage | — | Wither (list swap) | — | Text when a Havoc window holds under six Havoc-able casts. No rating. |
| warlock-destruction/Abilities/summon-infernal-efficiency | verified | `checkCooldownDrift` (Summon Infernal, 90s) | Summon Infernal; Inferno (120 → 90s) | Infernal held | 90% target, whole-fight, the ending cast expected even if the fight ends first, forced time counted as ready. The app's recharge of 90.0s matched WoWAnalyzer's cooldown bar on pull 3, and it counts whole lost uses less forced time. |
| warlock-destruction/Abilities/malevolence-efficiency | verified | `checkCooldownDrift` (Malevolence, 60s) + `burstGcdFindings` window | Malevolence | Malevolence held; idle in its window | 90% target, whole-fight. The 60.0s recharge matched the bar on pull 3 (and measures 60.0s on Affliction). WoWAnalyzer's spellbook entry is not talent-gated while its guide graph is. |
| warlock-destruction/Abilities/soul-fire-efficiency | covered | `checkCooldownDrift` (Soul Fire, ~46s, `prePullEvidenceIds`) | Soul Fire | Soul Fire held | 90% target on a fixed 45s. WoWAnalyzer misses a pre-pull Soul Fire (it showed 0:00-1:07 unused on pull 3, where the hard cast's own hit at 0:01.5 shows it was pressed first); the app credits it from that hit. |
| warlock-destruction/SpellUsable/soul-fire-shard-reduction | wrong | — | Soul Fire | — | WoWAnalyzer cuts Soul Fire's cooldown by 2s for each shard spent while it recharges, and its bars read about 41s. In the app's logs no player began a Soul Fire sooner than about 45s after the last landed (45.9s on pull 3; 45.3s and 45.6s for the top two), so the log shows no such reduction. `spentCooldownDrift` could take one, but there is nothing to pin it to. |
| warlock-destruction/SpellUsable/shadowburn-reset | candidate | — | Shadowburn | Shadowburn recharge reset by a kill | WoWAnalyzer resets Shadowburn when its debuff drops within about 5s of application, read as the target dying. Without it, a cooldown model for Shadowburn would flag kill-resets as early casts. Value only if Shadowburn becomes tracked; see Candidates left. |
| warlock-destruction/Abilities/shadowburn-efficiency | candidate | — | Shadowburn | Shadowburn held | 90% target with no cooldown declared in the spellbook. Needs the reset row and a charge or ready model; `chargesAt` could carry it. Execute-range windows (target at 20% health) are where it matters, which the log shows by the target's health on damage events. |
| warlock-destruction/Abilities/channel-demonfire-efficiency | candidate | — | Channel Demonfire | Channel Demonfire held | 95% target, cooldown 25s divided by haste. Not in `tracked-cooldowns.ts`, and no note says why. It is a channel, so the recast interval and any movement hold are separable in the log. |
| warlock-destruction/Abilities/conflagrate-efficiency | candidate | — | none | Conflagrate charge capped | 95% target on a 13s/haste recharge with two charges. Capped stretches are what lose a charge, which `cappedStretches` already computes for charged abilities. Conflagrate is also the Backdraft generator, so the Backdraft row prices its overlap. |
| warlock-destruction/Abilities/havoc-and-cataclysm-efficiency | no-damage | — | Havoc; Cataclysm | — | Both have the suggestion switched off (30s cooldowns, no target). Havoc is not tracked in the app on purpose: its value is what it copies, not its own hits, and the app's `havocTarget` values that; it was also pressed before the pull in the samples. |
| warlock-destruction/AlwaysBeCasting/downtime-thresholds | superseded | `checkGcdGaps` | none | idle time | A 20 / 35 / 40% override that the spec's own code never reads (the getter name doesn't match the core's), so it looks dead. If read, it would count forced idle as downtime. Whole-fight active time is the core row (core.md). |
| warlock-shared/SoulShardDetails/shards-wasted-per-minute | unverifiable | — | none | generators cast at or near five shards | 0.5 / 1.67 / 3.33 shards wasted a minute. The app's ranged.ts header says Soul Shards are logged only on their spenders, so a gain into a full bar isn't visible. WoWAnalyzer's tracker is its own model; I did not measure whether the log shows generator shards. |
| warlock-shared/GrimoireOfSacrifice/buff-uptime | candidate | — | Grimoire of Sacrifice | pet summoned or player dead | Buff uptime under 95 / 90 / 85% of the fight. Log-visible, but the pre-pull apply needs the normalizer. Very likely to fire on a death or battle-rez and nothing else, which `checkDeaths` already counts. |
| warlock-shared/utility | no-damage | — | none | — | Dark Pact (60% efficiency target, Frequent Donor shortens it) and Unending Resolve (33% target, Dark Accord shortens it), the Healthstone use grade, Soulburn, Demonic Circle, Fel Domination, Demonic Gateway, Mortal Coil, Shadowfury, Howl of Terror and their statistics. Utility and defensives aren't judged. |
| warlock-destruction/statistics | no-damage | — | — | — | Display only: Cataclysm, Channel Demonfire, Fire and Brimstone, Flashpoint, Internal Combustion, Reverse Entropy, Shadowburn and Soul Fire damage, shard fragments and the Chaos Bolt estimate, Rain of Fire targets, Havoc damage dealt, Backdraft and active-time gauges, the DoT bar, throughput windows (Havoc 15s, Infernal 30s), the shard graph, Grimoire of Sacrifice, Dark Pact, Unending Resolve and Demonic Circle statistics. Flashpoint and Reverse Entropy are haste buffs the app already fits into each player's GCD (`haste-statuses.ts`). |

Not in WoWAnalyzer: the app's `havocTarget` (Havoc put on the main
target). Havoc copies single-target spells onto a second enemy, so
putting it on the enemy being attacked copies nothing. Case study:
Wyrmtongues put it on Breath at 2:46 and aimed 12 of 13 spells at it;
the two top Warlocks put it on the other boss at all 9 swaps. Fires only
when 60%+ of a window's 3+ single-target casts went at the Havoc target
and another enemy was hit within the window; needs two clean windows on
the player to value a copy.

Not rules (models the rules above rest on): the Havoc recorder
(window, shards at cast, execute flag, target-death flag), the Havoc
pre-pull normalizer (a cast before the pull gets a fake apply at the fight
start), the Soul Fire shard and Shadowburn kill-reset cooldown models, the
Havoc-able spell list, the Backdraft stack tracker, the Soul Shard tracker,
the Grimoire of Sacrifice normalizer, the pre-pull DoT normalizer for
Immolate, the Dark Pact event pairing, the Arcane Torrent switch-off and the
guide shell. Nothing in the spec folder is dead code, apart from the
unread active-time override.

## Candidates left

None measured. By expected value:

1. **Immolate uptime without Wither**: the cheapest. The machinery is
   `dotUptimeFindings`, which already measures a DoT from its first
   application less forced time; the app just has no Immolate entry.
   Valued by the time off times the player's DoT damage per second. Separate
   a mistake from a top player's habit with the same-spec references:
   leaving it off during a long burn or add phase can be a choice.
2. **Conflagrate capped charges**: valued by the lost charge times the
   player's damage per Conflagrate. Phase 3 has to check whether the top
   Warlocks cap it on purpose, for example holding a charge for Backdraft.
3. **Channel Demonfire recast**: valued as whole lost uses, less forced
   time. Top players may hold it for movement or a Havoc window, which the
   same-spec comparison would show.
4. **Shadowburn efficiency with the kill reset**: needs a cooldown model the
   log doesn't state, and only matters in execute range. Lowest of the
   cooldown candidates.
5. **Grimoire of Sacrifice uptime**: likely to fire only on deaths already
   counted; low value.

`wrong` rows (Havoc windows, Soul Fire shard reduction) are not
candidates: the first grades idle the gap check already counts, and the
second is not seen in the logs on hand.
