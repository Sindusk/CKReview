# WoWAnalyzer audit: Protection Warrior

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Warrior shared layer,
  then the spec), spot-checked at their source lines (4 of
  4 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** lagging. Declares patch 12.0.7 (retail in the clone is 12.1.0),
  support level "Foundation" with one listed contributor; last change
  2026-06-09 (Shield Slam / Thunder Clap reset tracking). The changelog is
  not shown on its page. The Colossus hero-talent section is an empty
  TODO. Rules for talents that changed since 12.0.7 are marked doubtful in
  the notes, not made candidates.
- **App (at phase 2):** none for this spec. `lib/damage/wow/specs/tank.ts`
  said Protection Warrior was not in any sample yet, and the spec was keyed
  nowhere in `specs/index.ts` or `tracked-cooldowns.ts`. Only the generic
  checks (`checkGcdGaps`, `checkInterrupts`, `checkDeaths`, potion) applied.
  No case study exists. No status below is `verified`. Since phase 3:
  `specs/protwarrior.ts`. The potion check prices 0 on these pulls ("Light's
  Potential's bonus couldn't be measured"), a shared limit, not changed
  here.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Protection sets or
  adds. The class layer's one rule (a Fury-only Bladestorm annotation) does
  not apply to a tank.
- **Phase 3:** done 2026-10-17 on 23 player-pulls, all Mythic kills:
  the top Boost (yAb1xQmDrkgt7Ndf, Entombed Sentinels 100th), Graf
  (V7pckPz4tKHZC6Dq, Vashnik 100th), Enàver (Yfc7pADMwQgR8hXk, Vashnik
  99.7th), Sense (mNkHXhaD6Y2tqQTg, Entombed Sentinels 99.7th), fetched
  for this pass; the weaker 积塔 (v6NnRz4KDtYCJ3Mw, Vashnik 5.5th), 蹦嘎
  (7B1wQbjNhgXJDaHC, 13.8th), Dránash (Z7gYXjnQzR6JkpD8, 25.9th) and 14
  more on disk. Talents: 20 Mountain Thane, 3 Colossus (Kilwen ×2, Sense
  on Entombed Sentinels); everyone has Anger Management and Devastator;
  nobody presses Ravager or Champion's Spear. Built
  (lib/damage/wow/specs/protwarrior.ts, wired from tank.ts): Avatar held
  (90s less 1s per 20 Rage spent, exact on 124 intervals), Shield Slam
  held (the "Shield Slam!" ready buff running out while other presses
  go out), Rage at the cap (the shared check, which separates top from
  weak here). Thunder Blast and Burst of Power expiries in procs.ts;
  Demolish added as a GCD press with a lock (game.ts). The sweep's
  presses read right on the top players (87–90% GCD uptime; their
  remaining gaps are 1.2–2.1s after ordinary presses). Every number is in
  protwarrior.ts's header.

## The finding that decides this ledger

WoWAnalyzer grades almost nothing for Protection. It has no guide, no
checklist, no priority list and no cast-efficiency targets. Its threshold
getters exist in code but nothing reads them. Only one rule is live, the
per-cast "inefficient cast" note on Shield Block. The rows marked
"unconsumed" are design hints at most. Most of what is left is survival
(Shield Block, Ignore Pain, Spell Reflection), which the audit does not
judge. The damage-relevant material is small: the rotation's cooldown
resets and the offensive cooldowns.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| warrior-protection/ShieldBlock/inefficient-cast | no-damage | — | Devastator | a Shield Block cast that blocked fewer than 2 hits and had no extra Shield Slam while up | The only live rule. Good if it blocked 2+ hits, or if a Shield Slam landed inside it (one more with Devastator). Defensive half is survival, the user does not judge defensives. The offensive half is a count of Shield Slams, not damage, and ignores Heavy Repercussions. It skips anything before the first logged cast, so a pre-pull Shield Block is missed. Whether a block covered the big physical hits suits `lib/mitigation/` more than damage. |
| warrior-protection/ShieldBlock/good-cast-ratio | no-damage | — | Devastator | unconsumed | Share of good casts, under 90 / 80 / 70%. The same survival question as the row above; unread. |
| warrior-protection/ShieldSlam/slam-ratio | superseded | Shield Slam held (protwarrior.ts) | Devastator, Burst of Power | unconsumed | Casts against a self-built estimate of what fits, under 90 / 80 / 70%. Counts forced time as ready (whole fight). Phase 3: Shield Slam's readiness *is* in the log, as the "Shield Slam!" buff (224324: up from ready, or a reset, to the press; 6.0s at most, 2,451 gains on 23 player-pulls), so the app judges held readiness directly instead of a cast ratio: top players never let it run out unforced, the weaker 1–3 times (23–97k). |
| warrior-protection/BlockCheck/blocked-physical-share | no-damage | — | Heavy Repercussions | unconsumed | Share of physical damage taken under Shield Block, under 70 / 60 / 50% with Heavy Repercussions, 60 / 50 / 40% without; the branch with higher bars is dead code. Survival. Possibly useful for `lib/mitigation/` (a ready physical-share number per pull). |
| warrior-protection/RageDetails/waste | covered | Rage capped (`primaryResourceCapFindings`, protwarrior.ts) | none | rage generated into a full bar | Wasted ÷ generated above 5 / 10 / 15%, whole fight, unconsumed. Phase 3: wired for the spec. Unlike Frost DK or Marksmanship, it separates: top players cast at full Rage 0–3 times a pull (Graf V7pckPz4tKHZC6Dq 14k, Enàver 27k, Sense 17–27k, Boost none), the weaker up to 38 (Kilwen cpdvJRj9g3WAThzx 637k, 山路十八弯 254k, Earthrus 183k, 蹦嘎 99k). Priced at the player's Revenge / Execute / Impending Victory damage over all Rage spent (Ignore Pain is 39–65% of it), ~2k a Rage; Anger Management's lost Avatar time not counted. |
| warrior-protection/HeavyRepercussions/slam-in-block | no-damage | — | Heavy Repercussions | unconsumed | Share of Shield Slams cast under Shield Block, under 90 / 85 / 80%. It is a Shield Block lengthening rule; a 90% bar looks unreachable given the buff's uptime, so doubtful. |
| warrior-protection/RavagerHitCheck/ticks-per-cast | wrong (proposed) | — | Ravager | a Ravager that landed fewer than its six ticks | Distinct ticks per cast (ticks within 200ms merged), under 5.75 / 5.5 / 5. Named "targets" but counts ticks; casting at range gives five by the source's own comment, and ticks that hit nothing are not logged, so an empty area reads as missed. Unconsumed. Phase 3: nobody presses Ravager (0 casts on 23 player-pulls); its hits (228920 / 156287, 2–4% of damage) come in bursts of 2–8 ticks with no cast, on their own (Graf V7pckPz4tKHZC6Dq: 21 bursts, 0:02–6:16), so there is no press to grade. |
| warrior-protection/SpellReflect/magic-damage-covered | no-damage | — | Spell Reflection | unconsumed | Share of magic damage taken under Spell Reflection, under 25 / 15 / 5%. Survival and a bar so low it asks for nothing specific. |
| warrior-protection/Javelineer/poor-talent-selection | no-damage | — | Javelineer | never | Meant to flag the talent without a throw; both flags come from the same talent so it is always false. Dead code and a logic bug. Talent choice, not play. |
| warrior-protection/Abilities/cooldown-efficiency | covered | Avatar held (protwarrior.ts); others measured, not built | Anger Management (Avatar, Shield Wall); Thunderlord (Demoralizing Shout); Defender's Aegis / Honed Reflexes (Shield Wall) | an offensive cooldown held past ready | No ability declares an efficiency target, so the core default applies (core.md; counts forced time as ready). Offensive buttons: Avatar 90s, Ravager 90s, Demolish 45s, Shield Charge 45s, Champion's Spear 90s, Thunder Clap / Shield Slam / Execute (resets, see below). None is in tracked-cooldowns.ts, which has no Protection Warrior entry, so a sample must be surveyed first. Notes below. Phase 3: Avatar is judged by its Rage-spent recharge (next row). Shield Charge is a clean 45s (shortest 45.0s, median 47.5s) but worth 0–20k a use (its hits 47–106k a press against the GCD it takes): tracked, it read 2–99k a pull (Kérrìgan BTAdZMzQxgJf4XyH 99k, five uses; top Boost 17k), so left out. Demolish (Colossus, 30s): tracked, it read a 495k lost use on the 99.7th-percentile Sense (mNkHXhaD6Y2tqQTg, Entombed Sentinels; he presses it at 10 Colossal Might stacks, 38–43s apart three times) and none on Kilwen, so left out. Nobody presses Ravager or Champion's Spear. |
| warrior-protection/SpellUsable/shield-slam-resets | covered | Shield Slam held (protwarrior.ts) | Devastator, Burst of Power (Mountain Thane), tier set | — | Shield Slam goes ready early on proc buffs (explicit buff signals) and on guessed reset casts (Devastate, Execute, Thunder Clap, Thunder Blast, Revenge, Devastator swings). The explicit buff gains are in the log; the guessed ones are not, and the source warns they may overstate time on cooldown. A Shield Slam cadence check would sit on this model, so Shield Slam stays out unless a log shows the resets. A 250ms lag allowance (2s for Thunder Clap) decides natural versus reset. Doubtful for the reset list: it changed in the last changelog entry. Phase 3: no guessing needed, the log has a "Shield Slam!" buff (224324) from the moment Shield Slam is ready (cooldown back or reset) to the press, 6.0s at most; Shield Slam stays pressable after it runs out (积塔 v6NnRz4KDtYCJ3Mw 5:12.2 → Shield Slam 5:16.4). A reset while it's up logs as "refreshed" (17–20% of gains, top as weak: not judged). |
| warrior-protection/SpellUsable/thunder-clap-resets | covered | Thunder Blast expiry (procs.ts) | Avatar of the Storm (Thunder Blast), Storm Surge | — | Thunder Clap is ready at once on gaining a Thunder Blast stack; 3s cooldown while Avatar is up with Storm Surge. Stack gains may be logged as buff events; the cooldown change is not. Phase 3: Thunder Blast (435615, two stacks) is in the log and runs out 15.0s after the last gain: 8 of 868 gains, 7 in Entombed Sentinels' transitions, one unforced (积塔 6:16), none on the top players; listed in procs.ts. Storm Surge's shorter cooldown stays unverifiable. |
| warrior-protection/Cooldown-reductions/anger-management | covered | Avatar held (`spentCooldownDrift`, protwarrior.ts) | Anger Management | Avatar held or its recharge mis-modelled | Every 20 rage spent takes 1 second off Avatar and Shield Wall. The same shape as the Arms Avatar rule the app already models with `spentCooldownDrift` (melee.ts, shared.ts: 90s less 1s per 20 rage, matched on Arms). Fits `spentCooldownDrift`: rage spent from the log, no buff. Whether the Protection rate equals Arms' needs one log. Phase 3: it does. Over 124 Avatar intervals, elapsed + Rage spent ÷ 20 bottoms out at exactly 90.0s (p10 90.5s; ÷ 15 or ÷ 25 give 100.1 / 82.3). Built as Avatar held, valued by its window's bonus from the hits (11–17% for 17–25s). Fires on none of the 23 player-pulls: three Vashnik players who press it with every Imbibe, 83–91s apart (山路十八弯 9rGDw4WB3bv6VmnK, Enyò, 积塔), are inside the context's hold windows. Shield Wall's half is a defensive. |
| warrior-protection/Cooldown-reductions/thunderlord | unverifiable | — | Thunderlord | Demoralizing Shout held past its reduced recharge | Each Thunder Clap or Thunder Blast damage event takes 1.5s off Demoralizing Shout, up to 4.5s per cast. Damage events are in the log, so `spentCooldownDrift`'s per-event reduction (reduceOn) can model it. Shout is a utility and survival button; its damage value is Booming Voice (+20% damage to shouted targets per WoWAnalyzer) which is a statistic only. Low value; see candidates. Phase 3: everyone presses Demoralizing Shout 6–12 times a pull, but its debuff isn't in the fetch (the Warriors' enemy debuffs are Rend, Deep Wounds and item effects), so what a Shout adds to damage can't be read from the log. |
| warrior-protection/Cooldown-reductions/impenetrable-wall | no-damage | — | Impenetrable Wall | — | Each Shield Slam takes 6s off Shield Wall. Defensive; not judged. May matter to `lib/mitigation/` timing of Shield Wall. |
| warrior-protection/statistics | no-damage | — | various | — | Display only: Rage Wasted and the rage-by-spender panel, Physical Hits Mitigated, Shield Block bad-cast count, Heavy Repercussions extra seconds, Avatar (+20% damage) contributed with uptime, Booming Voice, Punish (+15% Shield Slam damage) uptime, cooldown-reduction effective and wasted seconds, Into the Fray haste by stack, Violent Outburst gaps and unused procs, Ravager ticks per cast, Ignore Pain absorbed, expired and overcapped (a guessed cap), the big-hit graph, the mitigation table, Avatar throughput. Violent Outburst "unused" (a refresh or a 30s expiry) is a proc-expiry check the app's `checkProcs` might cover; not measured, no sample. Phase 3: Violent Outburst (386478) never runs out (0 of 447 removals without a Shield Slam or Thunder Clap beside it), so nothing to check. Revenge! (5302, a free Revenge, not in WoWAnalyzer's rows) runs out at 6.0s on 36 of 523 gains, top as weak (Boost 5 a pull, Graf 1, Sense 1; Earthrus 6, 蚀之刻 5): left out of procs.ts; it saves only a Revenge's 20 Rage. Avatar's +damage window: idle inside it (`burstGcdFindings`) was tried and read top 29–172k a pull against weak 52–533k (and it's the gap check's idle again): not built. |
| warrior-shared/utility-defensives | no-damage | — | — | — | Shield Wall, Last Stand-type defensives, Ignore Pain, Spell Reflection mitigation, Demoralizing Shout, Rallying Cry, Impending Victory healing, the utility kit (Charge, Pummel, Taunt, Heroic Leap, Storm Bolt, Intervene, Shockwave, shouts). Utility, defensives and healing are not judged. Champion's Spear damage is a statistic only. |
| core/AlwaysBeCasting + core/CastEfficiency (this spec) | superseded | `checkGcdGaps` | none | idle time | Whole-fight active time is superseded by the gap check, as in core.md; this spec adds no threshold of its own. |

## Not rules

Hand-maintained models the rows above rest on: the spec's own rage tracker
(cap fixed at 100, 2 rage per hit taken, plus 1 with War Machine; a cap that
moves with talents is not reflected), the Ignore Pain absorb tracker, the
Shield Charge normalizer (invents a cast at the first damage event when the
log has none, 1.5s window; only with the talent), the spell-usable model
(resets, lag allowance), the buffs list, a haste override of 2% per Into the
Fray stack (4 stacks max), the spellbook, and the class layer's rage
normalizers and constants. Nothing there is a grade. The cooldown list in
the spellbook is a reference for tracked-cooldowns.ts, not a rule.

## Phase 3 results (2026-10-17)

Every candidate below was measured; the table rows hold the outcome.
Built: Avatar held (items 1–2), Rage at the cap (item 4), plus two checks
outside WoWAnalyzer's rows: Shield Slam held (its resets turned out to be
in the log) and the Thunder Blast / Burst of Power expiries. Left out
with numbers: Shield Charge and Demolish drift, idle inside Avatar,
Revenge! expiries. Proposed `wrong`: Ravager ticks (never pressed).
`unverifiable`: Thunderlord (no Demoralizing Shout debuff in the fetch).
No phase-2 row was `wrong`, so none to re-check.

Leads for `lib/mitigation/`, not built here: Shield Block's coverage of
the big physical hits and the blocked-physical share of a pull (the two
BlockCheck / ShieldBlock rows); Spell Reflection's share of magic damage;
Impenetrable Wall's Shield Wall recharge (6s per Shield Slam: Shield
Slam casts are in the log); Ignore Pain spends at the Rage cap (the cap
check above sees them as a tank's waste only when nothing is spent).

## Candidates left (phase 2, kept for the record)

All are unmeasured: the app has no Protection Warrior sample, so phase 3
starts with fetching one (a tank in a recent Mythic report and a top parse
of the same boss). Candidates are cheap and most fail phase 3.

1. **Survey the spec for tracked cooldowns** (Avatar, Ravager, Demolish,
   Shield Charge, Champion's Spear). Highest expected value because the
   mechanism exists and `checkCooldownDrift` already values a lost use. Avatar
   is the one that matters (a damage window of about +20% by WoWAnalyzer's
   statistic; read the real bonus from the player's own hits inside versus
   outside, as `observedWindowBonus` does for Sentinel). Ravager and the 45s
   pair add damage per use; value a use from the player's own damage per cast
   of that ability. What separates a mistake from top play: holds for a
   boss mechanic, a Stasis-like phase, or syncing with another cooldown. Add
   the survey interval rule (median within 1.25x of the shortest) before
   tracking; Avatar likely fails it because of Anger Management, which is the
   next item.
2. **Avatar with Anger Management** through `spentCooldownDrift`: 90s less 1
   second per 20 rage spent. Value: the missing Avatar window at the observed
   bonus. Measure rage spent from the log and compare predicted to actual
   Avatar recasts on 2-3 players, as was done for Arms; if the rate matches,
   reuse the Arms setup. Prot spends rage mostly on Ignore Pain and Revenge
   (Ignore Pain is a defensive and may itself be pooled for a tank's needs),
   so a short Avatar is not necessarily a mistake.
3. **Ravager ticks** (Ravager): value the lost ticks at the player's mean tick
   damage; the 200ms merge is a fact, not a table. What decides: the boss
   moving out of the area or an empty area, so firing only when targets were
   alive and in melee. Likely noisy.
4. **Rage at the cap**: wire `resourceCapFindings` for rage on casts, valued at
   the spender's damage per rage (Revenge, Execute; Ignore Pain is not
   damage). Rage comes mostly from hits taken, which the log cannot show as
   passive regen, so only casts made at the cap are visible (the same limit as
   Blood DK's Runic Power). Expected value low.
5. **Thunderlord / Demoralizing Shout** timing: the lowest value. It is a
   survival and utility button; skip unless a Prot log shows Booming Voice
   windows worth holding for.

Not candidates: Shield Slam and Thunder Clap cadence (resets are not in the
log), Shield Block, Ignore Pain, Spell Reflection and Shield Wall timing
(defensives; mitigation work, not damage). A hypothesis for
`lib/mitigation/`, not built here: the blocked-physical share on a pull,
and Shield Block coverage of the big hits, could feed a tank view.
