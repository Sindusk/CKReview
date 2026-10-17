# WoWAnalyzer audit: Guardian Druid

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Druid shared layer,
  then the spec), spot-checked at their source lines (3 of
  3 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares 12.0.1 (the clone is at 12.1.0, so one patch behind),
  support level "Foundation", **lagging**. Last changelog entry 2026-01-22,
  "initial Midnight activation, very rough state, some modules inactive";
  last real content change 2025-03-04. Of 21 module files, 13 are enabled
  and 8 are dead (commented out of the parser): Buffs, ActiveTargets,
  Galactic Guardian, Guardian of Elune, the Ironfur proc display, Frenzied
  Regeneration, Berserk, Convoke. The shared Lunation module is also off,
  and the guide itself hides the four rotation subsections (Mangle,
  Thrash, Moonfire, Swipe) and the per-cast Berserk breakdown. The talent
  tree was rewritten in Midnight and the spec's own "FIX ME" markers show
  its author could not map it, so every talent-dependent rule is doubtful.
  Every grade is a guide section; there is no priority list.
- **App:** nothing spec-specific. `lib/damage/wow/specs/tank.ts` has no
  Guardian entry (its header says Guardian Druid is in no sample yet),
  `tracked-cooldowns.ts` has no Guardian key (its cooldowns are not
  tracked), and `specs/index.ts` maps only Blood and Protection Paladin.
  Guardian gets the generic checks (`checkGcdGaps`, `checkInterrupts`,
  `checkDeaths`) and the potion check (`potion.ts`). No case study.
  Rows say "covered" where a generic check applies; nothing is
  "verified".
- **Phase 3:** not started.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Guardian sets or
  adds. The Druid class layer adds only an Innervate efficiency grade and
  a cooldown-declaration list (both in the no-damage row), and the shared
  Convoke, Lunation and Control of the Dream modules are not live for
  Guardian.

Guardian is a tank: healing and mitigation rules are no-damage here. Where
one looks useful for `lib/mitigation/` the note says so, but this audit is
about damage.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| druid-guardian/AlwaysBeCasting/active-time-grade | superseded | `checkGcdGaps` | none | idle time | Perfect up to 10% idle, good to 15%, ok to 20%, fail above; the whole-fight denominator with forced time counted as active. Looser than the core default. |
| druid-guardian/RageTracker/rage-waste-grade | candidate | — (`resourceCapFindings` exists in shared.ts but Guardian isn't keyed) | none | rage generated into a full bar | Wasted over generated: perfect only at exactly 5% (an equality test, so effectively never), good to 10%, ok to 20%, fail above. Its model adds an invisible fixed rage gain per auto-attack and mis-costs spending under the Berserk variants (the cost lines are commented out). The grade and the figure printed beside it use different quantities. Valuation: rage lost to the cap is Maul damage not dealt (Ironfur and Frenzied Regeneration are survival), so it would be valued as the lost rage times the player's own Maul damage per rage, from the log. A mistake versus top play: tanks spend rage on Ironfur by need, so a capped bar while Ironfur is already up is the only clean error; expect most top players to cap now and then. Whether rage is on the resource events of tank casts is unmeasured. Low expected value; most would fail phase 3. |
| druid-guardian/Ironfur/hit-coverage | no-damage | — | none | physical hits taken with no Ironfur up | Per hit: no stack bad, one good, two or more best; no overall score. Survival. Possibly useful for `lib/mitigation/` as an unmitigated-hit list, but its armor-mitigation test is a guess and an off-tank taking an untanked hit reads red. |
| druid-guardian/Mangle/cast-efficiency | wrong | — | Gore (resets the cooldown); Berserk: Ravage (halved it) | n/a as shipped | Recommended 70%, average 60%, major 50%. The cooldown declaration is commented out ("FIX ME"), so the core efficiency has nothing to divide by and the rule is inert, and the panel is never shown. If revived it would count forced time as ready and need the Gore reset, which the log shows only as a buff. Mangle is not in `tracked-cooldowns.ts` and is proc-reset, so the app would not track it. |
| druid-guardian/Thrash/cast-efficiency | wrong | — | Berserk: Ravage (commented) | n/a as shipped | Same shape as Mangle: core default target, no cooldown declared, inert, not displayed. The guide text says 100% is practically impossible yet the default target is stricter than Mangle's. |
| druid-guardian/Swipe/filler-discipline | wrong | — | Berserk / Incarnation (buff test only) | n/a as shipped | A Swipe cast is bad when Mangle or Thrash is ready within a second, or a Berserk or Incarnation buff is up. Depends on the commented-out Mangle and Thrash cooldowns (remaining cooldown is effectively always zero), a single-target ordering with no target-count condition (Swipe on a pack reads bad), and a 1s literal. Not displayed. |
| druid-guardian/Abilities/offensive-cooldown-bars | candidate | — (Guardian has no tracked-cooldowns entry; `checkCooldownDrift` would apply) | Berserk or Incarnation: Guardian of Ursoc (swaps the tracked spell); Lunar Beam | Berserk / Incarnation or Lunar Beam used fewer times than the fight allows | Core default target, whole-fight denominator, forced time counted as ready, last use expected even if the fight ends first, 180s and 60s literals. The Berserk variants were rewritten in Midnight, so the declared cooldown may be wrong (the app's Feral key measured Berserk at 120s). Valuation: a use lost times the damage in a Berserk window, read from the log as inside versus outside damage (`burstGcdFindings` style); needs the tank's own Berserk interval measured first, since the tracked list is built only from shortest intervals in survey logs and Guardian is in none. A mistake versus top play: holding it for a boss damage phase is normal tank behaviour (a defensive-adjacent cooldown), so the forced and hold windows would decide it. |
| druid-guardian/Guide/major-defensives | no-damage | — | Reinforced Fur, Oakskin, Survival of the Fittest | — | Barkskin and Survival Instincts judged by whether they cover damage spikes and are used at all; mitigation amounts assumed from talent ranks, not seen. Defensives are survival calls, not judged. Possibly useful for `lib/mitigation/` (spike coverage per use), but the percentages are hard-coded and may not match Midnight. |
| druid-guardian/Berserk/per-use-checks | wrong | — | Berserk variants; Incarnation: Guardian of Ursoc | n/a (dead code) | Each use graded on active time in its window (95 / 90 / 80%), rage wasted and zero Swipes, worst wins. The active-time part grades idle inside a window, the idle `checkGcdGaps` already counts (double-counted), with a hard-coded window length; the rage helper has reversed comparison signs. Not enabled. |
| druid-guardian/Berserk/ursocs-guidance-cdr | candidate | — | Ursoc's Guidance (Incarnation cooldown shortened by rage spent) | n/a (dead code) | The only talent-driven cooldown reduction the spec models: 1 second off the Incarnation cooldown per 20 rage spent (a TODO says it became per 25 rage in 11.0.2 and the code was never updated). Could feed `spentCooldownDrift` (a per-use value) only if Incarnation is tracked at all and the talent still exists in Midnight; unconfirmed, and the rule is doubtful. It is a cooldown-model input rather than a grade. Needs the Incarnation interval spread measured; probably skip. |
| druid-guardian/FrenziedRegeneration/inefficient-casts | no-damage | — | Guardian of Elune | n/a (dead code) | A cast is inefficient when its predicted heal is small and health is high. Healing and survival. Its 0.5 factor and 5s window are hard-coded and likely stale. |
| druid-guardian/GalacticGuardian/unused-procs | candidate | `checkProcs` (if the proc is logged as a buff) | Galactic Guardian | n/a (dead code) | A proc should be spent on Moonfire inside its window; unused above 30% triggers the suggestion. The talent has been reworked in Midnight, so doubtful. Would be valued as the proc's Moonfire damage left unused, from the log. Most top tanks likely drop a few procs under mechanics; low expected value. |
| druid-guardian/GuardianOfElune/unused-procs | no-damage | — | Guardian of Elune | n/a (dead code) | The proc buffs Ironfur or Frenzied Regeneration (defensive); unused above 30% triggers. Survival. Dead, and the Ironfur display built on it is dead too. |
| druid-guardian/Abilities/cast-efficiency-nongraded | no-damage | — | Survival of the Fittest, Innate Resolve, Reinvigoration | — | Survival Instincts, Bristling Fur, Red Moon and Frenzied Regeneration carry cooldowns or charges but no efficiency target; Frenzied Regeneration's cooldown is commented out. Defensive or utility. |
| druid-guardian/statistics | no-damage | — | — | — | Display only: Thrash bleed uptime and Moonfire debuff uptime over the whole fight (no grade, no target), the rage graph and rage usage tab, the active-time graph, mitigated damage per defensive use. Dead: Convoke damage share, unbuffed Ironfur share. |
| druid-shared/utility | no-damage | — | Innervate, Stampeding Roar, Heart of the Wild | — | The class layer's one grade is Innervate cast efficiency (80% target, 180s literal), which is utility; every other spellbook entry (Mighty Bash, Typhoon, Cyclone, Skull Bash, Wild Charge, Rebirth, dispels, forms, Barkskin) is utility or defensive with no target. Not judged. |

Not rules (models the rules above rest on): the rage tracker (a per-swing
rage constant and a display scale), the Gore Mangle-reset model (live, but
acts on a cooldown that is not declared), the Berserk / Incarnation spell
choice and duration constants, the Barkskin and Survival Instincts
mitigation helpers, the Ironfur buff window list, the shared form tracker,
the Convoke damage attribution, and the shared Lunation and Control of the
Dream cooldown models (not wired into Guardian).

## Candidates left

Ordered by expected value. All are low; Guardian has no sample in the app,
so phase 3 would first need a Guardian tank log on disk.

1. **Offensive cooldown bars** (Berserk or Incarnation, Lunar Beam): the
   only candidate with a real damage window behind it. Needs the Midnight
   Berserk cooldown measured and a hold-for-damage-phase check against top
   tanks.
2. **Rage waste**: small; rage is Maul budget and mostly an Ironfur
   survival resource.
3. **Galactic Guardian unused procs**: the talent was reworked; doubtful.
4. **Ursoc's Guidance cooldown reduction**: a model input, not a grade;
   probably skip.

Mangle, Thrash and Swipe grading are inert in WoWAnalyzer itself and need
no replacement beyond `checkGcdGaps`.
