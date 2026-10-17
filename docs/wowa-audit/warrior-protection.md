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
- **App:** none for this spec. `lib/damage/wow/specs/tank.ts` says
  Protection Warrior is not in any sample yet, and the spec is keyed
  nowhere in `specs/index.ts` or `tracked-cooldowns.ts`. Only the generic
  checks (`checkGcdGaps`, `checkInterrupts`, `checkDeaths`, potion) apply.
  No case study exists. No status below is `verified`.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Protection sets or
  adds. The class layer's one rule (a Fury-only Bladestorm annotation) does
  not apply to a tank.
- **Phase 3:** not started.

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
| warrior-protection/ShieldSlam/slam-ratio | unverifiable | — | Devastator, Burst of Power | unconsumed | Casts against a self-built estimate of what fits, under 90 / 80 / 70%. Counts forced time as ready (whole fight), and Shield Slam resets are not in the log, so the real ceiling is unknown. The source's own banner calls its reset tracking guesswork. Not shown to anyone. |
| warrior-protection/BlockCheck/blocked-physical-share | no-damage | — | Heavy Repercussions | unconsumed | Share of physical damage taken under Shield Block, under 70 / 60 / 50% with Heavy Repercussions, 60 / 50 / 40% without; the branch with higher bars is dead code. Survival. Possibly useful for `lib/mitigation/` (a ready physical-share number per pull). |
| warrior-protection/RageDetails/waste | candidate | — | none | rage generated into a full bar | Wasted ÷ generated above 5 / 10 / 15%, whole fight, unconsumed. The app already has `resourceCapFindings` / `primaryResourceCapFindings` (shared.ts, melee specs), but Protection is not wired to either. Note below. |
| warrior-protection/HeavyRepercussions/slam-in-block | no-damage | — | Heavy Repercussions | unconsumed | Share of Shield Slams cast under Shield Block, under 90 / 85 / 80%. It is a Shield Block lengthening rule; a 90% bar looks unreachable given the buff's uptime, so doubtful. |
| warrior-protection/RavagerHitCheck/ticks-per-cast | candidate | — | Ravager | a Ravager that landed fewer than its six ticks | Distinct ticks per cast (ticks within 200ms merged), under 5.75 / 5.5 / 5. Named "targets" but counts ticks; casting at range gives five by the source's own comment, and ticks that hit nothing are not logged, so an empty area reads as missed. Unconsumed. Note below. |
| warrior-protection/SpellReflect/magic-damage-covered | no-damage | — | Spell Reflection | unconsumed | Share of magic damage taken under Spell Reflection, under 25 / 15 / 5%. Survival and a bar so low it asks for nothing specific. |
| warrior-protection/Javelineer/poor-talent-selection | no-damage | — | Javelineer | never | Meant to flag the talent without a throw; both flags come from the same talent so it is always false. Dead code and a logic bug. Talent choice, not play. |
| warrior-protection/Abilities/cooldown-efficiency | candidate | `checkCooldownDrift` (not tracked) | Anger Management (Avatar, Shield Wall); Thunderlord (Demoralizing Shout); Defender's Aegis / Honed Reflexes (Shield Wall) | an offensive cooldown held past ready | No ability declares an efficiency target, so the core default applies (core.md; counts forced time as ready). Offensive buttons: Avatar 90s, Ravager 90s, Demolish 45s, Shield Charge 45s, Champion's Spear 90s, Thunder Clap / Shield Slam / Execute (resets, see below). None is in tracked-cooldowns.ts, which has no Protection Warrior entry, so a sample must be surveyed first. Notes below. |
| warrior-protection/SpellUsable/shield-slam-resets | unverifiable | — | Devastator, Burst of Power (Mountain Thane), tier set | — | Shield Slam goes ready early on proc buffs (explicit buff signals) and on guessed reset casts (Devastate, Execute, Thunder Clap, Thunder Blast, Revenge, Devastator swings). The explicit buff gains are in the log; the guessed ones are not, and the source warns they may overstate time on cooldown. A Shield Slam cadence check would sit on this model, so Shield Slam stays out unless a log shows the resets. A 250ms lag allowance (2s for Thunder Clap) decides natural versus reset. Doubtful for the reset list: it changed in the last changelog entry. |
| warrior-protection/SpellUsable/thunder-clap-resets | unverifiable | — | Avatar of the Storm (Thunder Blast), Storm Surge | — | Thunder Clap is ready at once on gaining a Thunder Blast stack; 3s cooldown while Avatar is up with Storm Surge. Stack gains may be logged as buff events; the cooldown change is not. |
| warrior-protection/Cooldown-reductions/anger-management | candidate | — | Anger Management | Avatar held or its recharge mis-modelled | Every 20 rage spent takes 1 second off Avatar and Shield Wall. The same shape as the Arms Avatar rule the app already models with `spentCooldownDrift` (melee.ts, shared.ts: 90s less 1s per 20 rage, matched on Arms). Fits `spentCooldownDrift`: rage spent from the log, no buff. Whether the Protection rate equals Arms' needs one log. |
| warrior-protection/Cooldown-reductions/thunderlord | candidate | — | Thunderlord | Demoralizing Shout held past its reduced recharge | Each Thunder Clap or Thunder Blast damage event takes 1.5s off Demoralizing Shout, up to 4.5s per cast. Damage events are in the log, so `spentCooldownDrift`'s per-event reduction (reduceOn) can model it. Shout is a utility and survival button; its damage value is Booming Voice (+20% damage to shouted targets per WoWAnalyzer) which is a statistic only. Low value; see candidates. |
| warrior-protection/Cooldown-reductions/impenetrable-wall | no-damage | — | Impenetrable Wall | — | Each Shield Slam takes 6s off Shield Wall. Defensive; not judged. May matter to `lib/mitigation/` timing of Shield Wall. |
| warrior-protection/statistics | no-damage | — | various | — | Display only: Rage Wasted and the rage-by-spender panel, Physical Hits Mitigated, Shield Block bad-cast count, Heavy Repercussions extra seconds, Avatar (+20% damage) contributed with uptime, Booming Voice, Punish (+15% Shield Slam damage) uptime, cooldown-reduction effective and wasted seconds, Into the Fray haste by stack, Violent Outburst gaps and unused procs, Ravager ticks per cast, Ignore Pain absorbed, expired and overcapped (a guessed cap), the big-hit graph, the mitigation table, Avatar throughput. Violent Outburst "unused" (a refresh or a 30s expiry) is a proc-expiry check the app's `checkProcs` might cover; not measured, no sample. |
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

## Candidates left

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
