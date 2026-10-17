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
- **App:** `lib/damage/wow/specs/destruction.ts` (Backdraft waste, Havoc on
  the main target, Havoc held; the worth of a Summon Infernal and a
  Malevolence), `ranged.ts` (`"Destruction Warlock"`: Malevolence window,
  Wither uptime), `tracked-cooldowns.ts` (Summon Infernal, Malevolence,
  Soul Fire), `potion.ts`, generic checks. Case study: qpZx3mWaG7gcDdYB
  pull 3 (Wyrmtongues, 29.9% against 47.1%) against the two top
  Destruction Warlocks of NK1hBtW9rckdjq36; the page was compared and the
  headers of ranged.ts and tracked-cooldowns.ts record what matched.
- **Phase 3:** done 2026-10-17 (Claude Opus 5.5). All Mythic, no fetch:
  34 Destruction player-pulls were already on disk. Top: 극세사이불
  (aZ6NnwL8g9PdpGJ1, 99.8th), Kellslocks (PAgdKqkXDTRfLnJy, 99.6th),
  Babybrain (dG8D9y6WxrfmtgXp, 99.5th), Xyron (GndQ9VFWtLzNjKpk, 99.4th),
  all Entombed Sentinels; 20 other Entombed Sentinels kills of 217–324k
  DPS (rankings put ~200k at the 20th percentile); the weaker Threefatez
  and Musclewizärd (both died); Zyndrøs and Girthgate on Vashnik; the
  static's Wyrmtongues (the case study and five gVDPhzp61Zm29HMw wipes).
  Probed Veloslock (Vashnik, 58.9th), Verteph and 阿庫拉瑪酋長 (Entombed
  Sentinels, ~20th) and Haruror (zpRGrxBgjJH7A3yk) for a non-Hellcaller
  build; ~180 WCL points with rankings. Scripts: `_scratch/dst-*.js`.
  - **Talents:** every player and probe is Hellcaller (Wither,
    Malevolence, Blackened Soul) with Shadowburn and Fiendish Cruelty,
    Soul Fire, Summon Infernal with Crashing Chaos (33 of 34) and the
    Overfiend, and Havoc (Zyndrøs takes Mayhem: 16 Havoc debuffs, no
    cast). Every one has a demon out. Nobody casts Immolate or Channel
    Demonfire, nobody takes Grimoire of Sacrifice, and only Zyndrøs and
    Girthgate (Vashnik) cast Cataclysm (Rain of Fire: Zyndrøs and
    Musclewizärd, 8 and 2).
  - **Built** (destruction.ts): Havoc held (a no-damage row hid it: a
    Havoc copies 1.2–2.3M); Summon Infernal and Malevolence valued per use
    (tracked, but worth 0 a use, so their drift never reported); Havoc on
    the main target no longer counts casts after the other enemies died.
    Backdraft and Havoc on the main target moved there from ranged.ts.
  - **Re-run on the top players:** Malevolence window 0–161k (weak up to
    764k), Wither uptime none (fires on two weak players), Backdraft
    0–328k (weak up to 594k), Soul Fire drift none (weak 0.28–1.03M),
    Infernal and Malevolence drift none on any pull (nobody lost a whole
    use), Havoc on the main target none (Fisor 1.32M, Junibacken 974k,
    Wyrmtongues 1.36M). All kept. Top players' GCD uptime 88–93%; the
    spell survey misses no press.
  - **Not built:** Conflagrate capped (the recharge can't be pinned; near
    the top players' floor). No sample: Immolate, Channel Demonfire,
    Grimoire of Sacrifice.
  - **Proposed `wrong`:** Shadowburn efficiency and its kill reset
    (Shadowburn has no cooldown). **Kept `wrong`:** both Havoc window
    grades, Soul Fire's shard cut.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Destruction sets
  or adds. The class layer (Dark Pact, Unending Resolve, Healthstone,
  Grimoire of Sacrifice, shard rate) is judged here too, because only this
  spec's ledger knows what the app does with it.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| warlock-destruction/Immolate/dot-uptime-grade | covered | `dotUptimeFindings` (Wither) | Wither | main DoT off every enemy | Rated by downtime: 1 / 5 / 10% (uptime 99 / 95 / 90%), over the whole fight, pooled over enemies. Stasis and untargetable time count as downtime, and time before the first application too; the app measures from the first application, less forced time. The app's entry names Wither only; the Immolate build is the next row. Phase 3: fires on two of 34 player-pulls (Demosucc WDNdyzgKArhYM327 177k, Musclewizärd nhbCYHXRf1T2qAv9 80k), on no top player. |
| warlock-destruction/Immolate/uptime-without-wither | candidate | — | none (no Wither) | Immolate off every enemy | The same rule for a player who didn't take Wither. The app's Destruction entry has no Immolate DoT, so those players get no DoT finding at all. Phase 3 (2026-10-17): **no sample**. All 34 player-pulls and four probes (20th–59th) are Hellcaller with Wither; nobody casts Immolate. The ids are in the masterData of 8AFnLQKdrcgawzDC, wWx8B1GPZMLghAyz and zpRGrxBgjJH7A3yk (cast 348, debuff 157736), from a fight not on disk. When a log turns up: `dot("Wither / Immolate", 445474, 157736)` in ranged.ts, the way Affliction pairs Wither and Corruption, then measure. |
| warlock-destruction/Backdraft/wasted-stacks-count | covered | `backdraft` (destruction.ts, `castTimeProcFindings`) | Backdraft | a Conflagrate into two stacks; stacks left to expire | Same two kinds of waste. The app prices a stack as the cast time it would have saved, measured from the player's own begin-casts, times their damage per GCD-second, and skips forced time. Ids and the two-stack maximum came from pull 3, but the Backdraft grade was not compared against the page (WoWAnalyzer rewrote it after the case study was planned), so this stays covered, not verified. WoWAnalyzer counts a stack expiring in a no-cast phase as waste with no forgiveness, and starts its tracker at zero for stacks gained before the pull. Phase 3: a stack is worth 0.35–0.42s of cast time (~110k). Top 0–328k a pull (극세사이불's three overcaps at 4:22–4:56 are Conflagrates inside his execute Shadowburn chain, which Backdraft doesn't speed; Xyron and Babybrain none), others 0–594k (Crittybity VBPkNJnWMdZx8wQ1: three overcaps, two expiries). Kept. |
| warlock-destruction/Backdraft/waste-rate-threshold | superseded | `backdraft` | Backdraft | — | A per-minute grade (1 / 1.5 / 2) on the same count. Nothing in the spec folder reads it. The count row above is the live one. |
| warlock-destruction/HavocGuide/window-shard-spend-grade | wrong | — | Havoc; Improved Havoc (20s window) | a Havoc window with few spenders | Grades shards spent per Havoc window against a full-window bar (10 for 15s, 14 for 20s; fails below 6 or 9). Spenders are counted by cast, so it is idle and movement inside the window graded a second time; `checkGcdGaps` already counts that idle. It also counts forced movement and an untargetable boss as castable, counts a free Shadowburn as a paid shard, and credits the player's own casts only on a cleave window. The app instead values the Havoc target choice itself (below). Phase 3 re-check (2026-10-17), **stays `wrong`**: the premise that some players save too few shards for Havoc fails here. Every Entombed Sentinels player put 60–74% of their shards (Chaos Bolt 2, paid Shadowburn 1) into Havoc windows that cover 49–61% of the pull; the top players 65–71%, Lowercaseg 70%, Demosucc 63%. A window's low count is the pull's last one, a dying add, or one aimed at the Havoc target itself (Fisor's 3:11.8: 2; Phycookie's last, 4:52.7: 2). What a player loses with Havoc is the window itself, now `havocHeld` and `havocTarget`. Mayhem players (Zyndrøs, 16 windows, no press) can't steer it at all. |
| warlock-destruction/HavocGuide/execute-burn-grade | wrong | — | Shadowburn; Havoc | an execute-range window with few Shadowburns | The same window rule counted in Shadowburns when the target is at or below 20% health (9 or 12 for Perfect). Window-graded cast count, so it double-counts idle. Its execute flag reads health from the last damage event on the target and can be stale. Phase 3 re-check (2026-10-17), **stays `wrong`**: under 20% (the raw hits' target health) a paid Shadowburn hit for 143–181k against a Chaos Bolt's 201–279k, about the same per shard (one against two), so the choice moves little damage. The 99.4th Xyron's paid Shadowburns hit 4 times under 20% while he kept casting Chaos Bolt (23 hits); 극세사이불 (99.8th) landed 65 paid Shadowburn hits there. |
| warlock-destruction/HavocGuide/target-death-prorating | superseded | — | Havoc | a shortened window | Scales the two window bars down when the target dies. A correction to the two rows above, which are already `wrong`. |
| warlock-destruction/HavocGuide/shards-banked-advice | unverifiable | — | Havoc | Havoc cast with under 3 shards | Advisory text, never changes a rating. The app's header says Soul Shards are logged on spenders only, so the banked count at the cast isn't in the log; WoWAnalyzer's own model re-derives it by heuristic. Not measured here. |
| warlock-destruction/HavocGuide/shadowburn-proc-feedback | no-damage | — | Shadowburn; Fiendish Cruelty | — | Praise text only, no grade. It assumes any Shadowburn outside execute range is a free proc cast. Phase 3: Fiendish Cruelty (1245664) is the free proc, and it is always spent: 0–1 removed a pull without a Shadowburn (Threefatez and Zyndrøs one each). Nothing to judge. |
| warlock-destruction/HavocGuide/low-cast-count-note | no-damage | — | Wither (list swap) | — | Text when a Havoc window holds under six Havoc-able casts. No rating. |
| warlock-destruction/Abilities/summon-infernal-efficiency | verified | `checkCooldownDrift` (Summon Infernal, 90s, `infernalValue`) | Summon Infernal; Inferno (120 → 90s) | Infernal held | 90% target, whole-fight, the ending cast expected even if the fight ends first, forced time counted as ready. The app's recharge of 90.0s matched WoWAnalyzer's cooldown bar on pull 3, and it counts whole lost uses less forced time. Phase 3 (2026-10-17): the tracked cooldown was worth **0 a use** (Infernal's damage is the pet's and Infernal Awakening 22703, nothing under 1122), so its drift could never report. Now valued in destruction.ts: the pet and Awakening per cast plus Crashing Chaos's Chaos Bolt bonus (read against Incinerate: +5–49%), less a GCD: 0.56–1.41M a use. Shortest interval 90.0s on the 34; nobody lost a whole use (longest holds: Crittybity 94.7 / 105.7 / 122.4s apart in 6:06). |
| warlock-destruction/Abilities/malevolence-efficiency | verified | `checkCooldownDrift` (Malevolence, 60s, `malevolenceValue`) + `burstGcdFindings` window | Malevolence | Malevolence held; idle in its window | 90% target, whole-fight. The 60.0s recharge matched the bar on pull 3 (and measures 60.0s on Affliction). WoWAnalyzer's spellbook entry is not talent-gated while its guide graph is. Phase 3 (2026-10-17): worth **0 a use** as tracked (its hit logs as 446285); now its hit (77–316k, all at the cast) plus its Chaos Bolt bonus in the cast's 20s window (+11–49% against Incinerate, outside Crashing Chaos, scaled to the cast windows' share of the buff: it also comes as an 8s proc, Kellslocks 0:28.4), less a GCD: 3–294k. No drift on any pull. The window check: top 0–161k a pull, weak up to 764k (Girthgate mNkHXhaD6Y2tqQTg). |
| warlock-destruction/Abilities/soul-fire-efficiency | covered | `checkCooldownDrift` (Soul Fire, ~46s, `prePullEvidenceIds`) | Soul Fire | Soul Fire held | 90% target on a fixed 45s. WoWAnalyzer misses a pre-pull Soul Fire (it showed 0:00-1:07 unused on pull 3, where the hard cast's own hit at 0:01.5 shows it was pressed first); the app credits it from that hit. Phase 3: fires on no top player; weaker 0.28–1.03M (Borny QFTXqD8VNKCvx9jf 1.03M, a 158.7s gap; Lumilol L8yGzCABtm6Zx1YR 973k). Kept. |
| warlock-destruction/SpellUsable/soul-fire-shard-reduction | wrong | — | Soul Fire | — | WoWAnalyzer cuts Soul Fire's cooldown by 2s for each shard spent while it recharges, and its bars read about 41s. In the app's logs no player began a Soul Fire sooner than about 45s after the last landed (45.9s on pull 3; 45.3s and 45.6s for the top two), so the log shows no such reduction. `spentCooldownDrift` could take one, but there is nothing to pin it to. Phase 3 re-check on 34 player-pulls (2026-10-17), **stays `wrong`**: the shortest begin after the previous landing is 44.8s, with 19, 20, 24 and 32 shards spent in between; 50 cycles began within 47s with 12–32 shards spent. A 2s cut a shard would have had it ready in under 10s. |
| warlock-destruction/SpellUsable/shadowburn-reset | wrong | — | Shadowburn | Shadowburn recharge reset by a kill | WoWAnalyzer resets Shadowburn when its debuff drops within about 5s of application, read as the target dying. Without it, a cooldown model for Shadowburn would flag kill-resets as early casts. Phase 3 (2026-10-17), **proposed `wrong`**: Shadowburn has no cooldown to reset here. Shortest intervals 0.73–0.96s (one GCD) on every player; 극세사이불 (aZ6NnwL8g9PdpGJ1) chained four to seven back to back at 3:59–4:05 on the boss, at 1 shard each. For the user's review. |
| warlock-destruction/Abilities/shadowburn-efficiency | wrong | — | Shadowburn | Shadowburn held | 90% target with no cooldown declared in the spellbook. Needs the reset row and a charge or ready model; `chargesAt` could carry it. Execute-range windows (target at 20% health) are where it matters, which the log shows by the target's health on damage events. Phase 3 (2026-10-17), **proposed `wrong`**: no cooldown (row above), so nothing sits ready. Shadowburn is a one-shard spender; its free casts come from Fiendish Cruelty, which every player spends (0–1 lost a pull). Paid Shadowburns are the execute choice in the execute row. For the user's review. |
| warlock-destruction/Abilities/channel-demonfire-efficiency | candidate | — | Channel Demonfire | Channel Demonfire held | 95% target, cooldown 25s divided by haste. Not in `tracked-cooldowns.ts`, and no note says why. It is a channel, so the recast interval and any movement hold are separable in the log. Phase 3 (2026-10-17): **no sample**: nobody casts it on the 34 player-pulls or the four probes. |
| warlock-destruction/Abilities/conflagrate-efficiency | candidate | — | none | Conflagrate charge capped | 95% target on a 13s/haste recharge with two charges. Capped stretches are what lose a charge, which `cappedStretches` already computes for charged abilities. Conflagrate is also the Backdraft generator, so the Backdraft row prices its overlap. Phase 3 (2026-10-17), **not built**. The 13s ÷ haste model doesn't fit: under it 5–10 presses a pull had no charge (Xyron 7, 극세사이불 10); the largest recharge every press fits, with the app's haste fit, is 9.2–10.8s hasted on the top players, and no logged cut explains the difference. Under each player's own fitted recharge (the lenient end), time at two charges outside forced time, past 1.25s a stretch: top 9.6–23.0s (1.3–3.5 Conflagrates), the other 28 0.9–41.6s (0.1–7.0) except Demosucc 88s (14.1; 3:39–4:04 casting Withers and a defensive) and Henzillxlock 56s (7.4). A Conflagrate is worth 147–204k against the ~80–118k Incinerate it replaces, so most players lose 0.1–0.4M, the top players' own floor. Some holds are deliberate: Kellslocks held both charges 3:06.7–3:18.2 at 5 Soul Shards, where a Conflagrate's shards would have been wasted. Scripts: `dst-conffit.js`, `dst-confcap.js`. |
| warlock-destruction/Abilities/havoc-and-cataclysm-efficiency | covered | `havocHeld` (destruction.ts) | Havoc; Cataclysm | Havoc held | Both have the suggestion switched off (30s cooldowns, no target). Havoc is not tracked in the app on purpose: its value is what it copies, not its own hits, and the app's `havocTarget` values that; it was also pressed before the pull in the samples. Phase 3 (2026-10-17): the Havoc half hides the spec's biggest press (1.2–2.3M copied a window on Entombed Sentinels), so it was measured and **built as Havoc held**: a flat 30s (shortest interval 30.0s; 20 of 32 pressers at 30.0–30.2s), held time counted only while two enemies took raid hits, past 6s a cycle (the top players' shard-banking holds reach 5.5–5.8s), priced as a share of the player's copies less a GCD. Top 0–245k a pull (Xyron 4:13 → 4:35), Neerthus 1.09M (LCFp3wbHvQqNP4my, 3:57 → 4:34), 龍蛋蛋 573k, Wyrmtongues 89–449k on four of six pulls, 15 players none. Cataclysm: only Zyndrøs and Girthgate (Vashnik) cast it; not measured. |
| warlock-destruction/AlwaysBeCasting/downtime-thresholds | superseded | `checkGcdGaps` | none | idle time | A 20 / 35 / 40% override that the spec's own code never reads (the getter name doesn't match the core's), so it looks dead. If read, it would count forced idle as downtime. Whole-fight active time is the core row (core.md). Phase 3: top players' GCD uptime 88–93% (survey sweep); no missing press precedes their gaps (only Dark Pact and a flask, both off the GCD). |
| warlock-shared/SoulShardDetails/shards-wasted-per-minute | unverifiable | — | none | generators cast at or near five shards | 0.5 / 1.67 / 3.33 shards wasted a minute. The app's ranged.ts header says Soul Shards are logged only on their spenders, so a gain into a full bar isn't visible. WoWAnalyzer's tracker is its own model; I did not measure whether the log shows generator shards. Phase 3: confirmed, shards (type 7, ×10) log only on Chaos Bolt and paid Shadowburn. On nine players checked, 5–18 of 47–73 Chaos Bolts a pull were cast at the 5-shard cap (the four top players 6–13), so shards do overflow at times; how much wasn't measured. |
| warlock-shared/GrimoireOfSacrifice/buff-uptime | candidate | — | Grimoire of Sacrifice | pet summoned or player dead | Buff uptime under 95 / 90 / 85% of the fight. Log-visible, but the pre-pull apply needs the normalizer. Very likely to fire on a death or battle-rez and nothing else, which `checkDeaths` already counts. Phase 3 (2026-10-17): **no sample**: all 34 player-pulls have a demon out and no Grimoire of Sacrifice buff. |
| warlock-shared/utility | no-damage | — | none | — | Dark Pact (60% efficiency target, Frequent Donor shortens it) and Unending Resolve (33% target, Dark Accord shortens it), the Healthstone use grade, Soulburn, Demonic Circle, Fel Domination, Demonic Gateway, Mortal Coil, Shadowfury, Howl of Terror and their statistics. Utility and defensives aren't judged. |
| warlock-destruction/statistics | no-damage | — | — | — | Display only: Cataclysm, Channel Demonfire, Fire and Brimstone, Flashpoint, Internal Combustion, Reverse Entropy, Shadowburn and Soul Fire damage, shard fragments and the Chaos Bolt estimate, Rain of Fire targets, Havoc damage dealt, Backdraft and active-time gauges, the DoT bar, throughput windows (Havoc 15s, Infernal 30s), the shard graph, Grimoire of Sacrifice, Dark Pact, Unending Resolve and Demonic Circle statistics. Flashpoint and Reverse Entropy are haste buffs the app already fits into each player's GCD (`haste-statuses.ts`). |

Not in WoWAnalyzer: the app's `havocTarget` (Havoc put on the main
target). Havoc copies single-target spells onto a second enemy, so
putting it on the enemy being attacked copies nothing. Case study:
Wyrmtongues put it on Breath at 2:46 and aimed 12 of 13 spells at it;
the two top Warlocks put it on the other boss at all 9 swaps. Fires only
when 60%+ of a window's 3+ single-target casts went at the Havoc target
and another enemy was hit within the window; needs two clean windows on
the player to value a copy. Phase 3 (2026-10-17): an aimed cast now counts
only while the raid was hitting another enemy within 2s. Phycookie
(ACmXHMFtaPLR9k8w, 1.36M at 4:52) had aimed at the only enemy left after
Breath and the Venom died; Fisor (baRCnPv62YQ1dJZN, 1.32M at 3:11, both
bosses up) and Junibacken (xN9cWhzbvqTVfrG8, 974k at 0:27) stay flagged.

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

Phase 3 (2026-10-17) worked the list. What's left:

1. **Immolate uptime without Wither**: no sample (every player is
   Hellcaller). One line once a log turns up (the row has it).
2. **Conflagrate capped charges**: measured, not built (row: the
   recharge can't be pinned and the loss sits at the top players' floor).
3. **Channel Demonfire recast**: no sample.
4. **Grimoire of Sacrifice uptime**: no sample.

Shadowburn efficiency and its kill reset are proposed `wrong`
(no cooldown). The kept `wrong` rows (Havoc window grades, Soul Fire
shard cut) were re-checked and their numbers are in the rows.
