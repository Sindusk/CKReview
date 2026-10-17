# WoWAnalyzer audit: Frost Mage

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Mage shared layer,
  then the spec), spot-checked at their source lines (3 of 3 matched;
  the first extract quoted source comments and was redone), and the
  ledger drafted by a Sonnet subagent, then reviewed in the main
  session. Reference only (AGPL): our own words, no ids or tables taken.
- **Spec:** declares 12.0.7, fully maintained, but phase-0 triage marked it
  "lagging" (the sibling specs declare newer patches). Last change
  2026-07-25 was a patch bump with "no spell changes needed"; earlier
  edits: 2026-03-29 (Ice Lance and Flurry feedback), 2026-02-22 (Ray of
  Frost), 2026-01-20 (Winter's Chill deleted). No priority list and no
  checklist: every grade is a guide section, and the Mage shared layer
  grades nothing. Rules tied to talent values (Freezing stack targets,
  shatter counts) are marked doubtful below, not built on.
- **App:** `lib/damage/wow/specs/ranged.ts` keys `"Frost Mage"` with an
  **empty check list** (no burst window: Icy Veins wasn't cast in the
  sample, and mages log only mana, so no resource-cap check).
  `tracked-cooldowns.ts` tracks Frozen Orb, Comet Storm and Ray of Frost;
  the generic checks (`checkGcdGaps`, `checkInterrupts`, `checkProcs`,
  `checkCooldownDrift`, `checkDeaths`) and `potion.ts` apply. No case study
  against a WoWAnalyzer page exists for this spec; `spell-data.ts` and the
  tracked list rest on one sampled player, flagged unverified.
- **Phase 3:** not started.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Frost sets or adds.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| mage-frost/AlwaysBeCasting/downtime-pct | superseded | `checkGcdGaps` | none | idle time | Above 5 / 15 / 25% of the whole fight idle (looser than the core 5 / 10 / 15). Whole-fight denominator, forced time counted as idle; the app values each gap less forced time. |
| mage-frost/CancelledCasts/cancelled-pct-guide | covered | `checkInterrupts` | none | a cast cut by movement or a boss interrupt | Core bands 2 / 5 / 15% of cast-time casts; counts boss interrupts and stuns too. Fire Blast, Combustion and Shimmer are excluded from the count. |
| mage-frost/BrainFreeze/proc-utilization | superseded | — | Brain Freeze | procs not spent | Share neither overwritten nor expired, 95 / 90 / 80%. It is the sum of the two rows below, so it is not scored separately. |
| mage-frost/BrainFreeze/overwritten-pct | candidate | — | Brain Freeze | a second proc landing while one is held | Refreshes ÷ procs, perfect at 0, fail above 10%. The grade's own source comment admits the numbers are tuned by feel. Value: the Flurry the lost proc would have paid, less the filler cast it displaced, from this player's own Flurry hits with and without the buff (the log has about 10.6 procs a minute). What would separate a mistake from top play: whether top players also let procs overlap during Flurry cooldown or movement. Not measured; likely low. |
| mage-frost/BrainFreeze/expired-pct | covered | `checkProcs` (expiries) | Brain Freeze | a proc running out unspent | The app sees only expiries, which is this row. Unconfirmed that `checkProcs` picks up Brain Freeze as a proc on a Frost pull: phase 3. A proc lost in forced downtime counts as expired in WoWAnalyzer; the app nets forced time. |
| mage-frost/FingersOfFrost/proc-utilization | superseded | — | Fingers of Frost | stacks lost | 95 / 85 / 70% of procs neither expired nor gained at two stacks. The sum of the two rows below. Pre-pull stacks are not credited by WoWAnalyzer. |
| mage-frost/FingersOfFrost/expired-pct | covered | `checkProcs` (expiries) | Fingers of Frost | stacks lapsing unspent | Fail above 10% of procs. Same unconfirmed pickup as Brain Freeze; stacks are a counted buff, so a stack-removed event may read as consumption. Phase 3. |
| mage-frost/FingersOfFrost/overcapped-pct | candidate | — | Fingers of Frost | a proc gained while two stacks are held | Fail above 10% of procs (about 23 a minute in the sample). Value: one Ice Lance's worth lost, less the Frostbolt-line cast that stands in for it. Separate from top play by whether top players also sit on two stacks while Frostfire Bolt is the only free cast. WoWAnalyzer reads the stack count 10ms before the event and skips refreshes caused by spending, so its own count is noisy. Low to medium. |
| mage-frost/IceLance/freezing-stacks-shattered | candidate | — | Heart of Ice, Polished Focus, Thermal Void, Frostfire Bolt (Frostfire tree), Splintering Sorcery (Spellslinger tree) | Ice Lance cast with no Fingers into a target with few Freezing stacks | Four buckets, fixed "poor" cutoff under 4 stacks; target stack count is 10 for the Frostfire tree and 6 for Spellslinger. Doubtful: the counts are talent-driven and may have shifted since 12.0.7, and the cleave handling is admittedly absent. Freezing is a debuff in the log, so a cast's stacks are readable. Value would be the Lance's damage against a with-Fingers or high-stack Lance from the same player; a candidate only if the stack numbers are re-measured. Expected value low. |
| mage-frost/Flurry/brain-freeze-priority | candidate | — | Brain Freeze, Flurry, Thermal Void | a Flurry cast into an active Thermal Void window | Prose priority "Flurry first when Brain Freeze is up", with the one exception of Thermal Void being active. Only the exception is checked (a donut and a timeline flag, no grade); the "without Brain Freeze" bucket is shown neutral. Value: the Thermal Void time lost by recasting early. Single-target logic. Top players likely munch it to avoid overwriting a proc, so low. |
| mage-frost/RayOfFrost/channel-hits | wrong | `checkGcdGaps` | Ray of Frost | a channel cut short | Perfect at all 8 ticks, good at 7, fail at 6 or fewer. A cut channel from forced movement or an untargetable boss is graded as the player's fault. What remains real is the idle after a cut channel, which `checkGcdGaps` counts. The text also asks for under 12 Freezing stacks on the target; that part is not checked at all. |
| mage-frost/RayOfFrost/cast-efficiency | covered | `checkCooldownDrift` (Ray of Frost, 44s) | Ray of Frost; Glaciate; Hand of Frost (second charge) | Ray of Frost held | Core default target 80%, whole-fight; WoWAnalyzer counts Stasis and forced time as ready. The tracked 44s is the shortest sampled interval (44.8 / 47.5s median), so the app is already lenient. WoWAnalyzer's model is a 60s cooldown less a tenth of a second per Freezing stack shattered by Ice Lance (Glaciate); that reduction is not applied in the app. Unverified: one sampled player. |
| mage-frost/CometStorm/cast-quality | wrong | — | Comet Storm | a single-target Comet Storm | The shattered-projectile count is hard-coded to zero in the source (a TODO says the tracker is missing), so every single-target cast grades Fail and only casts into two or more targets pass. Non-functional for single target. |
| mage-frost/CometStorm/cast-efficiency | covered | `checkCooldownDrift` (Comet Storm, 43s) | Comet Storm; Hand of Frost | Comet Storm held | Target 90%, whole-fight, Stasis counted as ready. The source itself flags its 60s cooldown and charges as wrong (it says the real cooldown is tied to Ray of Frost casts); the app's measured 43s (46.3s median) sidesteps this. Unverified: one sampled player. |
| mage-frost/FrozenOrb/cast-efficiency | covered | `checkCooldownDrift` (Frozen Orb, 60s) | Frozen Orb; Spellfrost Teachings | Frozen Orb held | Target 90%, whole-fight, Stasis counted as ready. WoWAnalyzer cuts the cooldown a quarter second per Frost Splinter hit; the app tracks the sampled 60.3s shortest interval, which already includes that reduction as observed. Unverified: one sampled player. |
| mage-frost/Abilities/other-efficiency | no-damage | — | none | — | Flurry (30s, haste-scaled, two charges), Blizzard, Cold Snap, Frostbolt, Ice Lance and Glacial Spike declare no efficiency target, and Arcane Torrent's is turned off; nothing is graded. |
| mage-frost/statistics | no-damage | — | — | — | Display only: Brain Freeze counts, Ice Lance total and average Freezing stacks shattered, Splitting Ice damage share, Glaciate and Spellfrost Teachings cooldown-reduction totals, the active-time gauge. |
| mage-shared/utility | no-damage | — | — | — | Utility and defensives aren't judged: Arcane Intellect (uptime statistic), Frost Nova, Ring of Frost, Blink or Shimmer, Counterspell, Remove Curse, Slow Fall, Spellsteal, Alter Time, Invisibility, Mirror Image, Polymorph variants; Ice Barrier absorbed, Ice Block or Ice Cold mitigation (a list of uses, no grade). Time Warp is a raid cooldown, not graded here. |

Not rules (models the rules above rest on): the cast-to-damage and
Brain Freeze or Fingers event links with their fixed windows (up to 18s),
the cooldown-reset models (Glaciate, Spellfrost Teachings, a Brain Freeze
proc giving a Flurry charge back, Cold Snap resetting its group, Barrier
Diffusion, Master of Time, Quick Witted), the aura list for timeline
highlights, the shared spellbook and constants (table, not extracted). The
Water Elemental module switches itself off in its constructor, so its pet
uptime and pre-pull summon thresholds are never evaluated. Preparation
(consumables) is the core question in core.md. Frost has no priority list;
its prose priorities are not machine-checked.

## Candidates left

By expected value, all unmeasured and likely to fail phase 3:

1. **FingersOfFrost/overcapped-pct**: the most frequent proc in the sample
   and a clean log signal (stacks at two when a proc lands). Needs a check
   that top players avoid it.
2. **BrainFreeze/overwritten-pct**: rarer, easier to value (a Flurry), but
   shares the same top-play risk.
3. **Flurry/brain-freeze-priority** (Thermal Void munching): narrow.
4. **IceLance/freezing-stacks-shattered**: doubtful on current talents;
   re-measure the stack targets before anything else.

A Glaciate-style Ray of Frost reduction (tenth of a second per stack
shattered, through `spentCooldownDrift` with a per-event reduction) is not
listed: the app already tracks Ray of Frost at its shortest sampled
interval, so a modelled reduction would only tighten an already lenient
check.
