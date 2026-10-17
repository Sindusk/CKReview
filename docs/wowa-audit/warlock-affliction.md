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
  uptime), `tracked-cooldowns.ts` (Malevolence 60s, Summon Darkglare 120s),
  `potion.ts`, generic checks. Soul Shards are logged on spenders only, so
  no shard check. **No case study:** the spec was sampled with six players
  for the survey (spell-data.ts) and never compared with a WoWAnalyzer page,
  so nothing here is `verified`.
- **Phase 3:** not started.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Affliction sets or
  adds.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| warlock-affliction/AlwaysBeCasting/active-time-grade | superseded | `checkGcdGaps` | none | idle time | Perfect only at zero downtime, Good to 5%, Ok to 10%, else Fail, over the whole fight with forced time counted as idle. The app values each gap less forced time. |
| warlock-affliction/AlwaysBeCasting/threshold-override | no-damage | — | none | — | Looser 10 / 15 / 20% thresholds under a suggestion name that nothing reads (the guide grade uses the core getter). Dead code; see Not rules. |
| warlock-affliction/CancelledCasts/cancel-rate-grade | covered | `checkInterrupts` | none | a cast cut by movement | Perfect to 1%, Good to 5%, Ok to 10% of casts. Counts boss interrupts and stuns as player cancels; the app counts the idle instead of a rate. |
| warlock-affliction/Agony/uptime-grade | covered | `dotUptimeFindings` (Agony) | none | Agony left off | Downtime 1 / 5 / 10% of the whole fight, pooled over enemies, forced time counted. The app measures from first application, less forced time. Agony is also the main shard source, which the app doesn't value. |
| warlock-affliction/Corruption/uptime-grade | covered | `dotUptimeFindings` (Wither / Corruption) | Wither switches the tracked debuff | Corruption or Wither left off | Same 1 / 5 / 10% steps. The app watches both ids as one DoT. |
| warlock-affliction/UnstableAffliction/uptime-grade | covered | `dotUptimeFindings` (Unstable Affliction) | Unstable Affliction | Unstable Affliction left off | Much looser: downtime 10 / 20 / 30%. The guide itself says low uptime is right on 2+ targets, where Seed of Corruption replaces it; the app has no target-count test, so on cleave this check may over-flag. Survey note: one Affliction let it drop 9-13s on Ula'tek and Vashnik, unreviewed. |
| warlock-affliction/Haunt/uptime-grade | candidate | — | Haunt | Haunt left off | Downtime 1 / 5 / 10%, but Haunt has a 15s cooldown and resets on add deaths, so full uptime may be unreachable. The app doesn't watch Haunt. Value it as the Haunt amplifier (16% plus 2% per rank of the node, a damage-taken bonus) times the player's damage during the gap, less forced time. See candidates. |
| warlock-affliction/Haunt/suggestion-thresholds | no-damage | — | Haunt | — | Dead getter (90 / 85 / 75% uptime), rendered nowhere. |
| warlock-affliction/Abilities/haunt-cast-efficiency | wrong | — | Haunt | Haunt cast less than once per 15s | 95% target over the whole fight. Resets on add deaths aren't modelled (the source says so), and forced time counts as ready. Not tracked in tracked-cooldowns.ts either; a Haunt reset has no reduction event to read. |
| warlock-affliction/Abilities/darkglare-cast-efficiency | covered | `checkCooldownDrift` (Summon Darkglare, 120s) | Summon Darkglare | Darkglare held | 90% target, whole-fight, forced time counted as ready. The app measured 120.0s shortest and 123.2s median across the survey. WoWAnalyzer models no reduction. |
| warlock-affliction/Abilities/dark-harvest-cast-efficiency | candidate | — | Dark Harvest; Cull the Weak | Dark Harvest held | Core default target; 60s cooldown. Not tracked: Cull the Weak takes 1.5s off per Unstable Affliction or Seed of Corruption cast, so its intervals spread. Fit for `spentCooldownDrift` with a fixed reduction per cast (`reduceOn`) and a pre-pull cast read from the buff, plus `valuePerUse` from the channel damage. See candidates. |
| warlock-affliction/Abilities/malevolence | covered | `checkCooldownDrift` (Malevolence, 60s) and the window check | Malevolence | Malevolence held, idle inside it | WoWAnalyzer lists it with no target and no window rule. The app tracks it (60.0s, matching the Destruction check against a WoWAnalyzer page) and `burstGcdFindings` grades GCDs inside the window. |
| warlock-affliction/CullTheWeak/cdr-efficiency | candidate | — | Cull the Weak; Dark Harvest | Dark Harvest held so reductions land on a ready cooldown | Same reduction rule seen from the other end: share of the 1.5s reductions that shortened a cooldown still running, at least 90% Perfect, 75% Good, 50% Ok. This is Dark Harvest's drift measured another way and is subsumed if the cast-efficiency candidate is built; do not build both. The reduction is modelled in the tool, not logged. |
| warlock-affliction/DarkHarvest/dot-coverage-per-cast | candidate | — | Dark Harvest; Wither, Unstable Affliction, Haunt | Dark Harvest cast with a DoT missing on a struck target | Each cast graded by its worst-covered target (Agony, Corruption or Wither, Unstable Affliction only on single target). Log-visible from damage and debuff events. Value it as the damage the channel consumes from missing DoTs; what separates a mistake from top play is whether top players cast it on a short DoT to avoid holding the cooldown. |
| warlock-affliction/DarkHarvest/empty-cast | wrong | — | Dark Harvest | cast striking no enemy | Automatic Fail when no channel damage lands within 3s of the cast. An untargetable boss or a dead target makes it Fail with no player fault, and the 3s bound ignores haste. |
| warlock-affliction/DrainSoul/shards-sniped | unverifiable | — | Drain Soul | adds killed outside Drain Soul | Shards per add kill, inferred from resource events; the kill attribution is a guess and the getter is rendered nowhere. Shards aren't logged on generators. |
| warlock-shared/SoulShardDetails/shards-wasted-per-minute | unverifiable | — | none | generators cast at or near five shards | Wasted shards per minute of the whole fight. Soul Shards appear in the log only on spenders, so waste at the cap can't be seen (ranged.ts header). |
| warlock-shared/GrimoireOfSacrifice/buff-uptime | candidate | — | Grimoire of Sacrifice | pet summoned, or buff down | Buff uptime under 95 / 90 / 85% of the fight. The buff is in the log. Low value: it is a death or resummon, which `checkDeaths` already values; build only if a page shows a resummon. |
| warlock-shared/defensives-and-utility | no-damage | — | Dark Pact, Unending Resolve, Frequent Donor, Dark Accord | — | Dark Pact (60% cast target), Unending Resolve (33%), the Healthstone grade, Demonic Circle, Fel Domination, Soulburn, Mortal Coil, Shadowfury, Howl of Terror, Soulwell, Gateway, Singe Magic. Defensives and utility aren't judged. |
| warlock-affliction/statistics | no-damage | — | — | — | Display only: Darkglare pet damage and average DoTs at cast, Dark Harvest damage and share, Cull the Weak wasted seconds, Absolute Corruption, Siphon Life and Haunt bonus damage, Drain Soul damage, Nightfall wasted procs, DoT uptime bars, active-time gauge, the Cooldown Usage graph, Resource Use and Preparation text. |

Not rules (models the rules above rest on): the shard tracker, the Grimoire
of Sacrifice and pre-pull DoT normalizers, the channel normalizer, the
global-cooldown override for Drain Soul, the Cooldown Throughput 20s
Darkglare window, Dark Harvest damage-to-cast matching, enemy debuff history,
and UnstableAfflictionEfficiency (records whether each Unstable Affliction
was removed early; nothing displays or grades it). Dead code: the duration
table with a Creeping Death reduction is imported by nothing, and the
Haunt, Drain Soul and active-time suggestion getters are unread.

## Candidates left

In expected-value order. Candidates are cheap and most fail phase 3.

- **Dark Harvest cast efficiency (with the Cull the Weak reduction):**
  best bet. The app tracks neither Dark Harvest nor any Cull the Weak
  model, and the reduction rule is simple enough for `spentCooldownDrift`
  (fixed reduction per cast, pre-pull cast from the buff, value from the
  channel). Phase 3 must check that the shortest intervals match the
  reduction model and that top players press it at the ready, since a
  Dark Harvest held for a burst window could be a choice.
- **Haunt uptime:** one extra `dot(...)` entry in ranged.ts if the id is
  confirmed in our own logs. Value: Haunt's damage-taken bonus times the
  player's damage in the gap. Doubt: resets and the 15s cooldown make
  perfect uptime unreachable, so a top-player comparison decides whether
  any gap is a mistake.
- **Dark Harvest DoT coverage:** per cast, from damage and debuff events.
  Phase 3 must separate a short DoT from a deliberate early cast.
- **Grimoire of Sacrifice uptime:** low value, overlaps deaths.
