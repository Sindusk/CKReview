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
- **App:** `lib/damage/wow/specs/ranged.ts` (`"Marksmanship Hunter"`:
  Trueshot window via `window`, Focus at the cap via
  `primaryResourceCapFindings`), `tracked-cooldowns.ts` (Trueshot 120s,
  Volley 45s), `potion.ts`, generic checks. Case study: qpZx3mWaG7gcDdYB
  pull 3 (Shadowmeld) against 3Vz6Qt2RyTPXwpJn's Imnotanorc (100th
  percentile), both pages saved; the header of ranged.ts records what
  matched: uptime 79.6% vs 94.9%, six cancelled Steady / Aimed Shots, one
  combat potion of two (the reference missed his second too), Trueshot 88%
  overstated (Stasis), idle mostly inside movement windows (not counted).
- **Phase 3:** not started.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Marksmanship sets
  or adds, plus the Hunter shared rules the spec wires.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| hunter-marksmanship/AlwaysBeCasting/active-time | superseded | `checkGcdGaps` | none | idle time | Bar raised to 95 / 90 / 87.5% of the whole fight; no consumer for the getter, so nothing visible. Whole-fight denominator, forced time included. Case study: 79.6% vs 94.9%, which the app shows as small delays and gaps. |
| hunter-marksmanship/Abilities/aimed-shot-efficiency | unverifiable | — | Aimed Shot; Trueshot, Take Aim, Focused Aim, Lock and Load, Steady Shot, Moon's Blessing (all change its recharge) | Aimed Shot charges sitting full | 90% target on a haste-scaled recharge with two charges. Not tracked in tracked-cooldowns.ts (a charge ability). The reductions are server-side or hand-modelled: Trueshot speeds the recharge by a rate that is never logged, and WoWAnalyzer's own model misses a Tactical Reload constant it keeps and never reads. Time at full charges can't be rebuilt from the log. Lost casts surface as idle or Focus held, which `checkGcdGaps` and the cap check already count. |
| hunter-marksmanship/Abilities/rapid-fire-efficiency | unverifiable | — | Rapid Fire; Trueshot (rate), Surging Shots (random reset), Take Aim | Rapid Fire held past ready | 90% target on a fixed 16s (not haste scaled). The Surging Shots reset is guessed from a recast on cooldown, so a missed reset reads as a missed cast either way. Cooldown reductions are never logged (dps-analysis.md). |
| hunter-marksmanship/Abilities/trueshot-efficiency | covered | `checkCooldownDrift` (Trueshot, 120s) + `burstGcdFindings` window | Trueshot; Calling the Shots (shortens it) | Trueshot held or skipped | 95% target, whole fight. **Overstates:** Stasis counts as ready, and the last use is expected even when the fight ends first (case study: 88% flagged at 0:03, 2:13, 4:47; ready 4:13, Stasis from 4:14.7, pressed 15.7s after, worth ~4s of Trueshot before the kill: no lost use). The 90s base plus a per-focus cut may double count Calling the Shots in WoWAnalyzer's own declaration (doubtful). The app tracks the shortest measured recast (120.3s), so a Calling the Shots player would only hide drift, never invent it. |
| hunter-marksmanship/Abilities/volley-efficiency | covered | `checkCooldownDrift` (Volley, 45s) | Volley | Volley held | 90% target, fixed 45s, whole fight; counts forced time as ready. Whether Volley is still a baseline Marksmanship talent isn't settled by the changelog (doubtful). |
| hunter-marksmanship/KillShot/kill-shot-efficiency | candidate | — | Kill Shot (off when Black Arrow is talented); Deathblow | Kill Shots skipped in the execute range | 85% of the casts the execute helper says were possible, not the whole fight (the better pattern). Value it from the log: target health on events and the Deathblow buff give the chances; a missed cast is worth a Kill Shot minus the filler it displaced, per this player's own hits. Phase 3 must show top players take nearly every one. Doubt: the helper tracks one target, so cleave counts the wrong boss; Black Arrow may replace Kill Shot at the current patch. |
| hunter-marksmanship/CallingTheShots/cdr-efficacy | superseded | `checkCooldownDrift` (Trueshot) | Calling the Shots | spending Focus while Trueshot is ready | Wasted reduction means Trueshot sat ready, which the Trueshot row already counts. Getter has no consumer; the reduction is modelled (a fixed amount per Focus), not logged; forced time where Trueshot is ready counts as wasted. Talent doubtful since 11.0.5. |
| hunter-marksmanship/PreciseShots/utilisation | candidate | — | Precise Shots; Windrunner's Quiver, No Scope (doubtful) | Aimed Shot cast over a live Precise Shots buff | Used ÷ (used + overwritten), under 90 / 85 / 80%; no consumer for the getter. WoWAnalyzer hard-codes the stack count it assumes (1, or 2 with a talent); the log carries the real stacks. Value it from the log: the boosted Arcane Shot or Multi-Shot damage lost against the average unboosted one. Phase 3 must check whether top players overwrite as often in Trueshot and under cleave, as the Elemental pass found for its similar rules; expect many to fail that. |
| hunter-marksmanship/PreciseShots/arcane-multishot-without-buff | candidate | — | Precise Shots | Arcane Shot or Multi-Shot cast with no buff | "Never" a timeline flag; Multi-Shot excused only when it starts Trick Shots from cold (a 50ms check). Stricter than any priority list behind it. Value from this player's unboosted vs boosted damage per cast, less the Focus-cap case (dumping Focus at the cap is normal). Likely to fail the premise check against top players; lowest of the three Precise Shots rows. |
| hunter-marksmanship/AimedShot/cast-with-precise-shots-stacks | superseded | — | Precise Shots, Trueshot | Aimed Shot cast before the stacks are spent | The same event the utilisation row counts, shown as a timeline flag instead of a rate. Its Trueshot exception is coarse (any Trueshot time). Fold into the utilisation candidate. |
| hunter-marksmanship/PreciseShots/black-arrow-without-buff | candidate | — | Black Arrow, Bleak Powder implied | Black Arrow cast into no buff and no new Trick Shots | Flagged unless Trick Shots turns on within half a second. Touched in the 2026-07-15 changelog, but it rests on a hero-tree interaction that may have moved (doubtful). Phase 3 first has to confirm the talent exists in current top logs. Very low value. |
| hunter-marksmanship/WailingArrow/cast-into-deathblow | candidate | — | Wailing Dead (hero talent) | Wailing Arrow cast while a Deathblow proc is already up | A guaranteed proc is wasted, which loses one free Kill Shot. Log-visible (buff plus cast). Value: a Kill Shot's damage less a filler's. Only meaningful for one hero tree and rare; doubtful at this patch. |
| hunter-marksmanship/WailingArrow/cast-once-per-trueshot | candidate | — | Wailing Dead | a Trueshot window with no Wailing Arrow | Presence in the window, not timing. A window cut by the fight end counts as a miss; a pre-pull Trueshot has stale state. Value: a Wailing Arrow cast's damage less a filler's, per window missed. Phase 3 must see whether top players ever skip it. Statistic counter only in WoWAnalyzer. |
| hunter-shared/CancelledCasts/cancelled-pct | covered | `checkInterrupts` | none | a cast cut by movement | Completed share under 97.5 / 95 / 90%. Aimed Shot is the main cast. No forced-phase handling. Case study: six cancelled Steady / Aimed Shots, the ~2s gaps. |
| hunter-shared/FocusTracker/percent-at-cap and FocusDetails/generator-waste | covered | `primaryResourceCapFindings` (Focus) | none | Focus generated into a full bar | At or under 5 / 10 / 15% of the fight at cap; wasted generator Focus 5 / 10 / 15%. Counts forced time. The spec itself hides the generator-waste tile because Focus isn't a rotation constraint for Marksmanship, so a cap finding here deserves skepticism. |
| hunter-shared/FocusCapTracker/natural-regen-waste | unverifiable | — | none | Focus at the cap with regen running | Regen lost at the cap is a model (5 a second, scaling with haste, cap fixed at 100). The log shows only casts made at the cap (dps-analysis.md). |
| hunter-shared/SentinelsMark/mark-outcome-grade | candidate | — | Sentinel (hero talent); Moon's Blessing | a mark that expires, is refreshed or dies unconsumed | Consumed by a hit is good; older than 11.7s is expired. Blind to forced phases (the code comment itself names one) and to cleave, where marks land on unreachable targets. Hero-tree and Moon's Blessing doubtful for 11.0.5. Low value. |
| hunter-shared/MoonlightChakram/use-grade | candidate | — | Moonlight Chakram; Stalk and Strike | no Chakram after Trueshot, or a low-hit cast | Fails under 4 hits; the Lock and Load half is hard-coded. The hit-count grade depends on target count, so a correct single-target cast scores poorly. Whether the spec wires it isn't confirmed from the extract; the ability is in its cast-efficiency list. Lowest value. |
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

## Candidates left

By expected value, all unmeasured and most likely to fail phase 3:

1. **PreciseShots/utilisation** (with the Aimed Shot flag folded in): the
   best of a weak set, since a lost Precise Shots charge is a lost boosted
   cast and the buff is fully in the log. Fails if top players overwrite as
   often.
2. **KillShot/kill-shot-efficiency**: valued from the execute window and the
   Deathblow buff; worth building only if top players take nearly all of
   them.
3. **Arcane / Multi-Shot without the buff**: expected to fail, since
   dumping Focus at the cap is normal.
4. **Wailing Arrow rows**, **Black Arrow**, **Sentinel's Mark**, **Moonlight
   Chakram**: hero-tree rules for a stale patch; check the talent is in
   top logs before measuring.
