# WoWAnalyzer audit: Augmentation Evoker

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Evoker shared layer,
  then the spec), spot-checked at their source lines (3 of
  3 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares 12.1.0, fully maintained; the real last touch is
  2026-09-24 (Mighty Inferno and Blistering Scales fixes; the entry at the
  top of the changelog is dated 2026-01-01, out of order and probably a
  typo). No priority list and no checklist: every grade is a guide
  section, a cast-efficiency target, or a per-cast Perfect / Good / Ok /
  Fail. Roughly 40 files of its own plus Evoker shared modules; one helper
  (`BuffTargetHelper`, ~670 lines) is imported by nothing.
- **App:** `lib/damage/wow/specs/ranged.ts` (`"Augmentation Evoker": []`,
  no spec check at all: no burst window, no resource, no DoT),
  `tracked-cooldowns.ts` (Breath of Eons and Time Skip, "unverified, 3
  players"), `potion.ts`, generic checks. **No case study:** nothing
  recorded in the app headers was compared against a WoWAnalyzer page for
  this spec, so nothing below is `verified`. The header notes Ebon Might
  is up 97% of the time in the three sampled players, and that Ebon Might
  and Prescience damage is credited to the Evoker by Warcraft Logs in its
  own way and is not in our rDPS split or streams (ranged.ts, game.ts).
  That limit decides most of the candidates below: the support the spec
  exists to give can't be valued from our data yet.
- **Phase 3:** not started.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Augmentation sets
  or adds. The Evoker shared layer rows that this spec switches on are
  included.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| evoker-augmentation/Abilities/upheaval-efficiency | candidate | — | Upheaval; Font of Magic; Interwoven Threads; Accretion; Time Skip; Midnight tier sets | Upheaval held | 95% target, whole-fight. Not tracked in tracked-cooldowns.ts and not named in its "spread too far" list; the recharge has the same shape as Stormkeeper's: a base (40s, 30s with the second tier 2-piece) cut by 1s per Eruption (Accretion), by Time Skip and by a faster rate under the first tier 4-piece. `spentCooldownDrift` takes a fixed reduction per buff event or a per-unit spend; an Eruption **cast** is neither, so this would need a small extension (reduce per cast of an ability). Value would be the lost uses times Upheaval's damage plus the buff-window it feeds, less forced time. Expected value low: top players may hold Upheaval for the Breath window, and the Time Skip reduction is uncertain from the log. WoWAnalyzer counts forced time as ready. |
| evoker-augmentation/Abilities/breath-of-eons-efficiency | covered | `checkCooldownDrift` (Breath of Eons) | Breath of Eons; Maneuverability; Interwoven Threads; Time Skip | Breath held | 95% target, major below 90%, against a modelled 120s cooldown. The app fits the recharge from the log instead (74s tracked, 74.6 / 91.3s observed on 3 players: unverified, with Time Skip and the rest folded in). **Overstates:** forced time counts as ready and the last use is expected even if the fight ends first; the app needs a whole lost use less forced time. Pre-pull not handled by WoWAnalyzer. |
| evoker-augmentation/Abilities/time-skip-efficiency | covered | `checkCooldownDrift` (Time Skip) | Time Skip; Interwoven Threads | Time Skip held | 95% / major 90% against 180s (×0.9 with Interwoven Threads). Tracked at 135s (135.8 / 155.8s observed on 3 players, unverified). Same overstatement as Breath: forced time as ready, one more use expected at the end. WoWAnalyzer still declares the target when Interwoven Threads switches the Time Skip module off. |
| evoker-augmentation/SandsOfTime/extend-inside-ebon-might | candidate | — | Duplicate; Double Time | Eruption, Fire Breath, Upheaval or Breath cast with the player's Ebon Might down | One verdict per cast, no denominator: Perfect (extended Ebon Might and Duplicate), Good (Ebon Might), Ok (down but a Breath fishing for Double Time), Fail (down). Log-visible: the buff up or down at the cast. Value: the 1 / 2 / 5 second extension lost, times the allies' Ebon Might bonus over that time. Ebon Might was up 97% of the time in the sampled players, so firings are rare; a cast made to rebuild the buff after a lapse is not a mistake (the lapse is). The allies' bonus is not in our streams, so valuing it needs ally damage in the lapse, which the log has but the app doesn't credit. Low value; phase 3 would first count lapses with an Ebon Might cast available, and compare against top players. |
| evoker-augmentation/BreathOfEonsRotational/ebon-might-uptime-in-window | candidate | — | Breath of Eons; Ebon Might | a buffed ally losing Ebon Might while Temporal Wounds are out | Window time kept ÷ window length, no steps. Log-visible (buff events on the raid). Caution: drops come from ally deaths, range and phase changes, which aren't the Evoker's doing; most would be forced or the allies' own. Value as the allies' damage across the lapse times the buff, which the app can't credit yet. Not a grade of the Evoker's active time, so not double-counting; but expected value low and the cause hard to assign. |
| evoker-augmentation/BreathOfEonsRotational/mob-died-early | candidate | — | Breath of Eons | Breath landed on an enemy that dies before Temporal Wounds ends | The damage banked on that enemy is lost; WoWAnalyzer estimates it with a guessed 0.8 priority-target factor. Log-visible (debuff removal with no later hit, enemy death). **Fight-blind:** a phase change that removes the debuff (untargetable boss, intermission) would read as an early death, so forced windows must be excluded. Value from the log would be the ally damage that would have landed on that enemy in the rest of the window, not a global factor. Best candidate for add-heavy fights (Venomous Abyss adds), where the Breath timing is a real choice; against that, top players may time Breath on the boss regardless of adds. Not measured. |
| evoker-augmentation/BreathOfEonsRotational/window-empower-and-time-skip-use | candidate | — | Font of Magic; Time Skip | Fire Breath, Upheaval or Time Skip ready through a Breath window and not cast in it | Casts in the window over what came off cooldown in it; per-window pass / fail bar. Readiness is modelled by hand (Eruption cuts, Time Skip, tier rate), so the "possible" count shifts when a source is missing. A within-window count of casts, not of active time, so it isn't the idle double-count. Value: the cast's damage, plus the buff-window it would have fed. Doubt: holding Upheaval for the next Breath is a deliberate line and the rule treats it as a miss. Check against top players before building. |
| evoker-augmentation/BreathOfEonsRotational/window-potion-and-trinket | wrong | `combatPotion` (potion.ts) covers the potion itself | none | — | Premise is stale: the trinket list is empty (row hidden) and the tracked potion is one from a past expansion, so a current potion isn't recognised; the code still carries its own TODO notes. Never fires reliably on Midnight. Whether a potion was drunk, with room for it, is the app's generic check; potion timing inside the Breath window isn't graded by us. |
| evoker-augmentation/CoreRotation/essence-at-cap | candidate | — | Power Nexus; Innate Magic; Volcanism | Essence at the cap | Time at the cap over the whole fight, Perfect at 10% or less, Fail above 20%. WoWAnalyzer rebuilds Essence from a hand-kept regen rate and cost table; the log carries Essence on spenders only (shared.ts, ranged.ts), so passive regen at the cap is unverifiable and only a spender-snapshot rebuild (`spenderSnapshotWaste`, used for Holy Power) is possible. The Devastation case study tried Essence waste and **did not adopt it**: it graded 12.7% "good". Divides by the whole fight, so downtime counts as capped time. Very low value; revisit only if a page and a log disagree. |
| evoker-augmentation/CoreRotation/active-time | superseded | `checkGcdGaps` | none | idle time | Downtime Good up to 5%, Ok up to 10%, Fail above, over the whole fight; forced downtime counts. The app values each gap less forced time. Not carried over. |
| evoker-augmentation/CoreRotation/cancelled-casts | covered | `checkInterrupts` | none | a cast cut by movement or a boss | Cancelled ÷ cast-time casts: Perfect at 1% or less, Fail above 5%. Counts boss interrupts and stuns as cancels. Engine note from the Devastation case: empower casts log their cast at the start beside the empowerstart and were read as cancelled; fixed in the engine (`timeline.ts`), but check the first Augmentation log for it, since Fire Breath and Upheaval are empowers here too. |
| evoker-augmentation/Cooldown/cooldown-graph-missed-use | covered | `checkCooldownDrift` (Breath of Eons, Time Skip) | Time Skip; Tip the Scales | a gap long enough to fit a whole extra use | Visual only. Breath of Eons and Time Skip are covered as above. Tip the Scales was left untracked because its intervals spread too far (47.8 / 64.0s); Fire Breath and Upheaval are unmodelled (see Upheaval above); Prescience highlights every gap, see candidates. |
| evoker-augmentation/ProcBuffs/imminent-destruction-and-mass-eruption | candidate | — | Imminent Destruction; Scalecommander (Mass Eruption); Leaping Flames | a buff expiring unspent | Shared-layer per-proc verdicts: Imminent Destruction stacks (6 per Breath, Eruption discount) and Mass Eruption stacks expiring or overcapping, a Leaping Flames charge decaying unspent. Log-visible, no denominator, binary. **Measured on Devastation, not here:** the same expiries were 3 / 1 / 1 / 1 on a kill, each well under a GCD, and were not adopted. Stack counts and caps are hard-coded; stacks lost in a forced window still fail. Probably the same on Augmentation, but not measured; `castTimeProcFindings` is the nearest existing shape. |
| evoker-shared/Abilities/fire-breath-efficiency | wrong | — | Ashes in Motion; Interwoven Threads | — | The 95% target is written as one test against two specs, so it applies to Devastation only and Augmentation almost certainly gets no grade. A probable source bug, not a rule. Fire Breath recharge here isn't modelled in the app either (Devastation's is "open": cut by Disintegrate ticks). |
| evoker-augmentation/CoreRotation/guide-prose-no-grade | no-damage | — | Blistering Scales; Regenerative Chitin | — | Prose with no check behind it: keep Ebon Might, Prescience, Shifting Sands and Duplicate up, Breath in high-damage phases, Blistering Scales on the active tank. Upkeep is graphed, not graded; "high-damage phase" and "right tank" are not log-visible. |
| evoker-augmentation/statistics | no-damage | — | — | — | Display only: Ebon Might uptime and personal vs external damage, Accretion cooldown saved, Anachronism, Blistering Scales, Double Time, Duplicate, Golden Opportunity, Hoarded Power, Mighty Inferno, Momentum Shift, Motes of Possibility, Nozdormu's Adept, Overlord, Pupil of Alexstrasza, Ricocheting Pyroclast, Rumbling Earth, Tectonic Locus, Symbiotic Bloom, Volcanism, tier-set bonus figures, empower rank usage, buff and Essence charts. |
| evoker-shared/utility | no-damage | — | — | — | Defensives (Obsidian Scales, Cauterizing Flame, Zephyr), mobility, crowd control and raid utility (Rescue, Time Spiral, Source of Magic, Blessing of the Bronze) are declared with no efficiency target. Not judged. |

Not rules (models the rules above rest on): the Ebon Might length model
(base length, Sands of Time extensions, a carry-over on refresh, started on
cooldown when cast before the pull), the cast-link and reorder normalizers
(Ebon Might, Prescience, Temporal Wound, Double Time, failed extensions),
the Breath window builder and buffed-player map, the Essence tracker and
cost lookup, the hand-written cooldown model (Time Skip's tenfold
recovery with a ceiling, Accretion's 1s, Interwoven Threads ×0.9,
Nozdormu's Adept, the two Midnight tier rates; one comment and its constant
disagree on the first 4-piece rate), and the empower SpellUsable subclass.
Dead code: the `BuffTargetHelper` folder.

## Candidates left

Ordered by expected value. All are cheap to write and most will fail phase
3; the shared obstacle is that Ebon Might and Prescience value is not in
our streams, so anything that needs it is blocked until the app credits
support damage.

- **mob-died-early**: the one rule about a real Breath timing choice, and
  the only one whose value (ally damage lost on a dying target) can be read
  from the log without the support credit. Needs forced windows excluded
  first. Phase 3: count Breath casts where the target dies inside the
  window, on top players and the three sampled Augmentation players, and
  see whether top players avoid it.
- **window-empower-and-time-skip-use**: casts vs readiness inside Breath
  windows. Phase 3: do top players hold Upheaval or Fire Breath for the
  next window? If so, it fails the premise check as the Elemental
  Ascendance rules did.
- **upheaval-efficiency**: needs a per-cast reduction in
  `spentCooldownDrift` (Eruption cutting 1s). Phase 3: fit the recharge
  from recasts as was done for Stormkeeper.
- **Prescience capped charges** (the cooldown bar's every-gap mode, not a
  WoWAnalyzer target): two charges, 10 or 12s; the capped-charge machinery
  in checks.ts exists. Value blocked on the support credit.
- **extend-inside-ebon-might**, **ebon-might-uptime-in-window**: blocked on
  the same credit, rare by the 97% uptime.
- **imminent-destruction-and-mass-eruption**, **essence-at-cap**: the
  Devastation case found equivalents worth under a GCD or not adopted.
