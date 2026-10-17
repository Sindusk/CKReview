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
- **Phase 3:** done 2026-10-17 (Claude Opus 5.5). Three kills fetched
  (one fight each, ~110 WCL points with the rankings), the rest on disk.
  All Mythic, 27 player-pulls:
  - top: Sol (mNkHXhaD6Y2tqQTg, Vashnik 100th), Shasta
    (Ndh2H6Qw4Pp1qaMk, Vashnik 99.7th), 주황양배추 (aZ6NnwL8g9PdpGJ1,
    Entombed Sentinels 100th), Thwash (L8yGzCABtm6Zx1YR, Entombed
    Sentinels 99.3rd); also Gowownage (hjHXmdnJFwTPpMtK), 失落的桃子
    (J3ckBVtrZNfWv1h7), Worthtwo and Kirabearr (JvQpZk3CXj78Dx2f),
    Zhorxanina (7pFPAqzc2NHLXjwZ);
  - weak: Экстраособь (7L3RKpavDA8T4MjY, 78k/s on Vashnik, below the
    20th percentile's 105k), Mêrùem (LCFp3wbHvQqNP4my, 73k/s), and the
    static's Diggersby (16 pulls on seven bosses, gVDPhzp61Zm29HMw;
    108–134k/s).

  Talents, from casts and buffs: everyone plays Incarnation: Guardian of
  Ursoc (it casts Wild Guardian beside it), Gore and Elune's Chosen
  (Lunar Beam, Fury of Elune procs); Red Moon on all but three, who press
  Moonfire and take Galactic Guardian. Nobody casts Berserk or Convoke;
  Tooth and Claw shows on nobody.
  **Engine fix (5109690):** no Guardian was in the spell survey, so
  Mangle, Thrash, Swipe, Maul, Lunar Beam, Red Moon and Raze weren't
  actions and every press read as idle (주황양배추: 4.5% GCD uptime, 19.0M
  "lost"); now 86–93% on the four top players. Built: Lunar Beam tracked
  (`tracked-cooldowns.ts`, 40s, valued by its hits, `burstHold`) and Gore
  in `procs.ts` (10s). No spec check: Incarnation drift, idle inside
  Incarnation and Red Moon drift fire on the top players as much as or
  more than on the weak; Rage waste is negligible. The model and numbers are in
  `lib/damage/wow/specs/tank.ts` (Guardian notes).
  Two leads for the user, outside WoWAnalyzer's rules: Diggersby casts no
  Swipe and waits on Mangle / Thrash (GCD uptime 66–81%, the top players
  86–93%; Entombed Sentinels Pull 5 2:51, 3.3s idle after a Mangle), his
  biggest loss by far; and the GCD-gap price runs high for every
  Guardian (the average GCD, 86–113k, against a Swipe's ~20k: 10k of hits
  plus a 21% Gore chance on a ~50k Mangle).
  Mitigation leads for `lib/mitigation/` (not built): Ironfur is where
  ~95% of Rage goes (1,150–2,440 Rage per Incarnation cycle), so stacks
  per physical hit are readable from the buff stream; Incarnation (35s,
  every 106–172s) and Lunar Beam are also defensive windows that top tanks
  time to the fight.
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
| druid-guardian/AlwaysBeCasting/active-time-grade | superseded | `checkGcdGaps` | none | idle time | Perfect up to 10% idle, good to 15%, ok to 20%, fail above; the whole-fight denominator with forced time counted as active. Looser than the core default. **Phase 3 (2026-10-17):** `checkGcdGaps` read every bear press as idle until they were added to game.ts (5109690): 주황양배추 4.5% → 92.6%; top players now 86–93%, Diggersby 66–81% (he never presses Swipe). The gap price runs high for Guardian (average GCD 86–113k against a Swipe's ~20k); left for the user. |
| druid-guardian/RageTracker/rage-waste-grade | candidate | — (`resourceCapFindings` exists in shared.ts but Guardian isn't keyed) | none | rage generated into a full bar | Wasted over generated: perfect only at exactly 5% (an equality test, so effectively never), good to 10%, ok to 20%, fail above. Its model adds an invisible fixed rage gain per auto-attack and mis-costs spending under the Berserk variants (the cost lines are commented out). The grade and the figure printed beside it use different quantities. Valuation: rage lost to the cap is Maul damage not dealt (Ironfur and Frenzied Regeneration are survival), so it would be valued as the lost rage times the player's own Maul damage per rage, from the log. A mistake versus top play: tanks spend rage on Ironfur by need, so a capped bar while Ironfur is already up is the only clean error; expect most top players to cap now and then. Whether rage is on the resource events of tank casts is unmeasured. Low expected value; most would fail phase 3. **Phase 3 (2026-10-17), measured, not built:** Rage (type 1, max 100) is logged on every cast. Casts made at full Rage by a non-spender: top players 0–4 a pull (Gowownage 4, Sol 1), Diggersby 0–9 (Vashnik Pull 2: 9, Ironfur up on all), the weak Экстраособь 23 and Mêrùem 21. ~95% of Rage goes to Ironfur; most Mauls are free (Sol paid 600 Rage for 15). At ~8 Rage a capped cast and 600–800 a Rage from Maul, the worst is ~150k a pull: negligible. |
| druid-guardian/Ironfur/hit-coverage | no-damage | — | none | physical hits taken with no Ironfur up | Per hit: no stack bad, one good, two or more best; no overall score. Survival. Possibly useful for `lib/mitigation/` as an unmitigated-hit list, but its armor-mitigation test is a guess and an off-tank taking an untanked hit reads red. |
| druid-guardian/Mangle/cast-efficiency | wrong | — | Gore (resets the cooldown); Berserk: Ravage (halved it) | n/a as shipped | Recommended 70%, average 60%, major 50%. The cooldown declaration is commented out ("FIX ME"), so the core efficiency has nothing to divide by and the rule is inert, and the panel is never shown. If revived it would count forced time as ready and need the Gore reset, which the log shows only as a buff. Mangle is not in `tracked-cooldowns.ts` and is proc-reset, so the app would not track it. **Phase 3 (2026-10-17), kept `wrong`:** Mangle-to-Mangle intervals outside Incarnation with no Gore gained between still run down to 0.99–1.12s (p05) on every top player, so the resets aren't all in the log and no cooldown can be rebuilt. Mangle is 47–50k a cast; top players press it 19–25 a minute, Diggersby 16 (fewer fillers, fewer Gore procs: 3–4 a minute against 5–9). |
| druid-guardian/Thrash/cast-efficiency | wrong | — | Berserk: Ravage (commented) | n/a as shipped | Same shape as Mangle: core default target, no cooldown declared, inert, not displayed. The guide text says 100% is practically impossible yet the default target is stricter than Mangle's. **Phase 3 (2026-10-17), kept `wrong`:** Thrash intervals run 2.1–5.3s (p05) and 4.3–5.0s (median) on the same players, no clean cooldown to judge against; idle while it's ready is `checkGcdGaps`'. |
| druid-guardian/Swipe/filler-discipline | wrong | — | Berserk / Incarnation (buff test only) | n/a as shipped | A Swipe cast is bad when Mangle or Thrash is ready within a second, or a Berserk or Incarnation buff is up. Depends on the commented-out Mangle and Thrash cooldowns (remaining cooldown is effectively always zero), a single-target ordering with no target-count condition (Swipe on a pack reads bad), and a 1s literal. Not displayed. **Phase 3 (2026-10-17), kept `wrong`:** Mangle's readiness can't be rebuilt (row above), and Swipe is worth little either way: 10k of its own hits a cast plus a 21% chance of Gore (37 of 180 Swipes on the top players), ~20k in all. The opposite mistake is the real one: Diggersby presses no Swipe at all and idles instead (`checkGcdGaps`). |
| druid-guardian/Abilities/offensive-cooldown-bars | verified | `checkCooldownDrift` (Lunar Beam, 40s, `burstHold`); Incarnation measured, not built | Berserk or Incarnation: Guardian of Ursoc (swaps the tracked spell); Lunar Beam | Berserk / Incarnation or Lunar Beam used fewer times than the fight allows | Core default target, whole-fight denominator, forced time counted as ready, last use expected even if the fight ends first, 180s and 60s literals. The Berserk variants were rewritten in Midnight, so the declared cooldown may be wrong (the app's Feral key measured Berserk at 120s). Valuation: a use lost times the damage in a Berserk window, read from the log as inside versus outside damage (`burstGcdFindings` style); needs the tank's own Berserk interval measured first, since the tracked list is built only from shortest intervals in survey logs and Guardian is in none. A mistake versus top play: holding it for a boss damage phase is normal tank behaviour (a defensive-adjacent cooldown), so the forced and hold windows would decide it. **Phase 3 (2026-10-17):** nobody plays Berserk. *Lunar Beam* (cast 204066; hits 1270292 and 414613, masterData of aZ6NnwL8g9PdpGJ1 / mNkHXhaD6Y2tqQTg): shortest interval 40.0s, median 42–44s, first use median 5.0s; 340–470k of its own hits a use (its mastery also lifts the rest: Red Moon ticks ×1.36 inside it, not counted). Tracked (8b52772), valued by its hits less the GCD, `burstHold`: Shasta (99.7th) held it for Vashnik's Venoms (4:28 → 5:45). Lost: top players none (Sol, Shasta, 주황양배추, Thwash, Gowownage, 失落的桃子, Worthtwo, Kirabearr); Zhorxanina none with the hold windows (366k without); Mêrùem 596k (2 uses; the longest hold from 0:48); Diggersby 263k at Nek'zali Pull 2 (5:13), none on his other 15 pulls. *Incarnation: Guardian of Ursoc* (102558; it casts Wild Guardian 1269658 beside it): a 35s window, damage rate ×1.3–2.9 inside (2–4.8M extra a window; Thrash, Mangle and the Wild Guardian's Feral Frenzy). Its cooldown fits 180s less 1s per 25 Rage spent (next row). Not built: seven of the nine top and middle tanks hold one use 38–67s past ready (주황양배추 49s, Sol 67s, Worthtwo 42s, Kirabearr 58s, 失落的桃子 55s, Gowownage 38s, Zhorxanina 32s; Shasta and Thwash press it within 6s every time), the weak Экстраособь and Mêrùem 1–12s, Diggersby 63–85s on Entombed Sentinels and 0–48s elsewhere. Held time doesn't separate good play from bad, and no whole use is lost on any of the 27 player-pulls. |
| druid-guardian/Guide/major-defensives | no-damage | — | Reinforced Fur, Oakskin, Survival of the Fittest | — | Barkskin and Survival Instincts judged by whether they cover damage spikes and are used at all; mitigation amounts assumed from talent ranks, not seen. Defensives are survival calls, not judged. Possibly useful for `lib/mitigation/` (spike coverage per use), but the percentages are hard-coded and may not match Midnight. |
| druid-guardian/Berserk/per-use-checks | wrong | — | Berserk variants; Incarnation: Guardian of Ursoc | n/a (dead code) | Each use graded on active time in its window (95 / 90 / 80%), rage wasted and zero Swipes, worst wins. The active-time part grades idle inside a window, the idle `checkGcdGaps` already counts (double-counted), with a hard-coded window length; the rage helper has reversed comparison signs. Not enabled. **Phase 3 (2026-10-17), kept `wrong`:** a `burstGcdFindings` trial on the Incarnation window read 0–6 GCDs short a window on the top players (Shasta 36 of 42 at 0:07, 失落的桃子 25 of 30 at 4:36) and 1–7 on the weaker (Diggersby 24 of 31 at Kith'ix 2:06): top as weak. The window's extra damage is mostly more Mangles and the Wild Guardian, not a bonus per GCD. Zero Swipes in it is no loss (Swipe ~20k); Rage in it is the Rage row's. |
| druid-guardian/Berserk/ursocs-guidance-cdr | candidate | — | Ursoc's Guidance (Incarnation cooldown shortened by rage spent) | n/a (dead code) | The only talent-driven cooldown reduction the spec models: 1 second off the Incarnation cooldown per 20 rage spent (a TODO says it became per 25 rage in 11.0.2 and the code was never updated). Could feed `spentCooldownDrift` (a per-use value) only if Incarnation is tracked at all and the talent still exists in Midnight; unconfirmed, and the rule is doubtful. It is a cooldown-model input rather than a grade. Needs the Incarnation interval spread measured; probably skip. **Phase 3 (2026-10-17), measured, not used:** Incarnation intervals run 106–172s (49 on 27 player-pulls); 180s less 1s per 25 Rage spent between the casts (Rage costs from the casts' logged amounts, ~95% of it Ironfur) leaves none under the line and 14 within 2s of it (Shasta 106.2s after 1,950 Rage: 102.0s predicted). It would drive an Incarnation drift check, which wasn't built (row above). |
| druid-guardian/FrenziedRegeneration/inefficient-casts | no-damage | — | Guardian of Elune | n/a (dead code) | A cast is inefficient when its predicted heal is small and health is high. Healing and survival. Its 0.5 factor and 5s window are hard-coded and likely stale. |
| druid-guardian/GalacticGuardian/unused-procs | unverifiable | — (`checkProcs` needs a measured duration in procs.ts) | Galactic Guardian | n/a (dead code) | A proc should be spent on Moonfire inside its window; unused above 30% triggers the suggestion. The talent has been reworked in Midnight, so doubtful. Would be valued as the proc's Moonfire damage left unused, from the log. Most top tanks likely drop a few procs under mechanics; low expected value. **Phase 3 (2026-10-17):** the buff (213708) shows on the three players who skip Red Moon and press Moonfire (失落的桃子 J3ckBVtrZNfWv1h7, Kirabearr JvQpZk3CXj78Dx2f, Mêrùem LCFp3wbHvQqNP4my, the weakest): 85 removals, every one beside a Moonfire, longest span 12.75s. Nothing ran out, so no duration can be measured and no loss was seen, even on the weakest player. |
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

Gore (93622, the Mangle reset) now expires in `procs.ts` (phase 3): 10s,
4 expiries at 10.00–10.03s on 27 player-pulls, all in forced time.
Tooth and Claw shows on nobody.

## Candidates left

After phase 3 (2026-10-17), none worth building:

1. **Rage waste**: ~150k a pull at most, on the weakest player.
2. **Ursoc's Guidance cooldown reduction**: the model is confirmed (180s
   less 1s per 25 Rage), but Incarnation drift doesn't separate the top
   tanks from the weak, so nothing uses it.

Measured outside the rules and not built: Red Moon (30.0s shortest). Two
top players (Gowownage, Worthtwo) press it right after every Lunar Beam,
every 40s, an even trade since its ticks hit ×1.36 inside the beam.
Tracked at 30s it flagged them (826k, 448k) and the weak little more
(Экстраособь 400k, Diggersby 0–381k); with a 10s hold allowance it
flagged only them.

Mangle, Thrash and Swipe grading are inert in WoWAnalyzer itself and need
no replacement beyond `checkGcdGaps`.
