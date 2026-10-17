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
- **Phase 3 (2026-10-17):** done (Claude Opus 5.5). Measured on 31
  Augmentation player-pulls of 29 players, all Mythic kills: 28 already on
  disk (the Augmentation players in other specs' references) and three
  top Vashnik kills fetched for this pass (baRCnPv62YQ1dJZN fight 37,
  phzkLrdNBgtfCmW9 fight 54, MrVh6X8p1BRAJCYt fight 20). Top: Batchester
  (Vashnik 100th, Entombed Sentinels 98.1st), 영능턴종영능 (99.8th),
  Fuexovoker (99.3rd), Dreamsweet (Entombed Sentinels 99.8th),
  Augmentfluup (98.5th), 식용드래곤 (96.3rd), Dracman (95.9th). Weak:
  Yùkîï (7pFPAqzc2NHLXjwZ, 4th), Uvokerx (ZC7YNpr2HVQLtjv1, 8th), Chiggen
  (a4kX1DNT27yHGvqJ, 17.6th), Имродорми (7L3RKpavDA8T4MjY, 18.4th),
  Snarkareth (KB1a9CWc6pT4VGqA, 23.8th), Avelinna, Shixxevo, Dwng
  (44–47th). Talents: all Chronowarden (Chrono Flames, Temporal Burst),
  Duplicate, Time Skip, Fate Mirror, two Prescience charges; nobody plays
  Scalecommander. **The premise of phase 2 was wrong:** Warcraft Logs
  writes the support (Ebon Might, Prescience, Shifting Sands, Fate
  Mirror, Inferno's Blessing, Breath of Eons) as the Evoker's own hits,
  about three quarters of their damage, so it can be priced from the log.
  It had also been counted as GCD damage, pricing every Augmentation gap
  ~3× high (148–221k a GCD against 45–92k for the presses): fixed in
  game.ts (624c665). Built in specs/augmentation.ts (fede696), on a
  recovery model fitted to the casts (×11 in Time Skip, +1% per Temporal
  Burst stack): Ebon Might down while ready, Prescience charges capped,
  Breath of Eons and Time Skip held (replacing the tracked 74s / 135s,
  worth 0 a use), Breath of Eons that never exploded. The header there
  has every model and number.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Augmentation sets
  or adds. The Evoker shared layer rows that this spec switches on are
  included.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| evoker-augmentation/Abilities/upheaval-efficiency | candidate | — | Upheaval; Font of Magic; Interwoven Threads; Accretion; Time Skip; Midnight tier sets | Upheaval held | 95% target, whole-fight. Not tracked in tracked-cooldowns.ts and not named in its "spread too far" list; the recharge has the same shape as Stormkeeper's: a base (40s, 30s with the second tier 2-piece) cut by 1s per Eruption (Accretion), by Time Skip and by a faster rate under the first tier 4-piece. `spentCooldownDrift` takes a fixed reduction per buff event or a per-unit spend; an Eruption **cast** is neither, so this would need a small extension (reduce per cast of an ability). Value would be the lost uses times Upheaval's damage plus the buff-window it feeds, less forced time. Expected value low: top players may hold Upheaval for the Breath window, and the Time Skip reduction is uncertain from the log. WoWAnalyzer counts forced time as ready. Phase 3 (2026-10-17), **not built, no model fits:** under the recovery model (augmentation.ts) and 1s per Eruption, the shortest intervals still spread from 6 to 24s (resets, and a cancelled empower logs as a press 0.7–1.0s before the real one). Rates a minute alive: the top Vashnik players 2.91–3.47 (Batchester 3.40, 영능턴종영능 3.32, Fuexovoker 2.91), the weak 2.62–3.17 (Snarkareth 2.62, Avelinna 2.77, Chiggen 3.17); ~0.3 a minute × ~260k an Upheaval (its hits, Reverberations and Future Self's) is ≤0.5M a pull. |
| evoker-augmentation/Abilities/breath-of-eons-efficiency | covered | `breathHeld` (specs/augmentation.ts) | Breath of Eons; Maneuverability; Interwoven Threads; Time Skip | Breath held | 95% target, major below 90%, against a modelled 120s cooldown. **Overstates:** forced time counts as ready and the last use is expected even if the fight ends first; the app needs a whole lost use less forced time. Pre-pull not handled by WoWAnalyzer. Phase 3 (2026-10-17): the tracked 74s fixed recast was worth 0 a use (the damage logs under 409632, not the cast's id) and never reported; a fixed recast can't fit anyway (71–122s raw). Rebuilt in augmentation.ts: 120s under the fitted recovery model (shortest recovered interval 120.2s on 83 intervals), held time less 3s a stretch, plus room for one more before the last 16s (a Breath there never explodes); a use is the player's average explosion (0.53–1.66M) less a GCD. Fires on no top player; Bddrgdotcom (6Bpq1FmA9aH4WQxc, 68.5th) 963k and Blueprínt (VWMbYPRyxCAmhZFj) 856k skipped the opener Breath (first at 1:26 / 1:15); Nutnut (GndQ9VFWtLzNjKpk, 70th) 1.08M. |
| evoker-augmentation/Abilities/time-skip-efficiency | covered | `timeSkipHeld` (specs/augmentation.ts) | Time Skip; Interwoven Threads | Time Skip held | 95% / major 90% against 180s (×0.9 with Interwoven Threads). Same overstatement as Breath: forced time as ready, one more use expected at the end. WoWAnalyzer still declares the target when Interwoven Threads switches the Time Skip module off. Phase 3 (2026-10-17): the tracked 135s was worth 0 a use (Time Skip deals nothing) and never reported. Fitted 141.5s (shortest 141.8s with Temporal Burst counted; Time Skip doesn't speed itself); valued (inference) as its 30s of recovery: a quarter Breath plus two Prescience presses, 0.6–1.2M a use. Counts whole recharges held only: room for a third use fired on every Entombed Sentinels kill, top ones included (all cast two, the second at 2:44–2:55), so it was left out. Fires on nobody (Yùkîï held 59s, Snarkareth 48s). |
| evoker-augmentation/SandsOfTime/extend-inside-ebon-might | covered | `ebonMightDown` (specs/augmentation.ts) | Duplicate; Double Time | Eruption, Fire Breath, Upheaval or Breath cast with the player's Ebon Might down | One verdict per cast, no denominator: Perfect (extended Ebon Might and Duplicate), Good (Ebon Might), Ok (down but a Breath fishing for Double Time), Fail (down). Log-visible: the buff up or down at the cast. A cast made to rebuild the buff after a lapse is not a mistake (the lapse is). Phase 3 (2026-10-17): the allies' bonus is in the log after all, as the Evoker's Ebon Might hits (395152, 48–76k a second up). Built as the lapse itself: Ebon Might off the Evoker past its 30s cooldown (fitted under the recovery model; a raw 27s read up to 2.0M), less 2s a lapse, × that rate. A cast with Ebon Might down has nothing to extend, so the lapse is the whole loss. Top players 0–123k a pull (Batchester, 영능턴종영능, Fuexovoker, Dreamsweet 0); weak Dwng (8kVQMJ4rmpnyRjBH) 601k (6.9s at 2:22), Avelinna 422k, Paxthyr 314k, Snarkareth 221k. |
| evoker-augmentation/BreathOfEonsRotational/ebon-might-uptime-in-window | candidate | — | Breath of Eons; Ebon Might | a buffed ally losing Ebon Might while Temporal Wounds are out | Window time kept ÷ window length, no steps. Log-visible (buff events on the raid). Caution: drops come from ally deaths, range and phase changes, which aren't the Evoker's doing. Phase 3 (2026-10-17), **not built, negligible:** Ebon Might sits on 10–13 allies on average through the Breath windows (cast to +14s; 107 windows); 7 windows lost an ally for over 1s: five single allies (deaths or range: Batchester's 0:04 Yasuo 11.5s, Soegerinho's 5:07 Divinmonky 7.6s) and two whole-raid lapses of the Evoker's own (Dwng 1:22 5.2s, Dracman 4:42 1.3s), both with Ebon Might's cooldown still running. The Evoker's own lapses when ready are `ebonMightDown`'s. |
| evoker-augmentation/BreathOfEonsRotational/mob-died-early | covered | `breathNoExplosion` (specs/augmentation.ts) | Breath of Eons | Breath landed on an enemy that dies before Temporal Wounds ends | The damage banked on that enemy is lost; WoWAnalyzer estimates it with a guessed 0.8 priority-target factor. **Fight-blind:** a phase change that removes the debuff would read as an early death. Phase 3 (2026-10-17): Temporal Wound isn't in the debuff stream, but its explosion (409632) lands 12.1–14.7s after every Breath. Built as "Breath of Eons never exploded": a Breath 16s+ before the end with no explosion, lost = the player's average explosion, forced when the 16s are mostly forced. 3 of the 106 Breaths cast 16s+ before the end: Yùkîï and Snarkareth's Vashnik openers (0:04, 941k and 1.11M: a single boss, so the Breath missed) and Dreamsweet's 3:02 on Entombed Sentinels (99.8th, 971k; every enemy kept being hit through 3:20, so no early death). A partial loss (one of several targets dying) wasn't seen: explosions land on one or two enemies here. Breaths in the last 16s of a kill (6, top players among them) aren't judged. |
| evoker-augmentation/BreathOfEonsRotational/window-empower-and-time-skip-use | wrong | — | Font of Magic; Time Skip | Fire Breath, Upheaval or Time Skip ready through a Breath window and not cast in it | Casts in the window over what came off cooldown in it; per-window pass / fail bar. Phase 3 (2026-10-17), **proposed `wrong`** (for the user's review): Temporal Wound banks the allies' damage, not the Evoker's own, so an empower gains nothing from being inside the window (only its 2s Ebon Might extension, and Ebon Might lapsed raid-wide in 2 of 107 windows). The top players skip them as often as the weak: Batchester's Vashnik window at 2:37 and Dreamsweet's at 3:02 had no Fire Breath or Upheaval, Fuexovoker's 1:16 no Upheaval; Time Skip lands in a window only at the opener and where the two cooldowns meet (~4:30). |
| evoker-augmentation/BreathOfEonsRotational/window-potion-and-trinket | candidate | `combatPotion` (potion.ts) covers the potion itself | none | — | WoWAnalyzer's version is stale (the trinket list is empty and the tracked potion is a past expansion's), the phase-2 reason for `wrong`. Phase 3 (2026-10-17) re-checked the rule itself, **overturned to candidate, not built, negligible:** 29 of 38 combat potions on the 31 player-pulls were drunk in a Breath window (5s before to 14s after the cast), every top player's included; the nine outside are weaker players' (Bddrgdotcom and Blueprínt skipped the opener Breath, second potions at 4:32–6:08). A potion outside the window loses only what the Temporal Wound would have banked of the support it added (an explosion is ~0.5–2.5M on ~13 buffed allies' damage), well under 100k. |
| evoker-augmentation/CoreRotation/essence-at-cap | wrong | — | Power Nexus; Innate Magic; Volcanism | Essence at the cap | Time at the cap over the whole fight, Perfect at 10% or less, Fail above 20%. The log carries Essence on spenders only (type 19, on 55–60% of Eruptions), so passive regen at the cap is unverifiable. The Devastation case study tried Essence waste and did not adopt it. Phase 3 (2026-10-17), **proposed `wrong`** (for the user's review): Eruptions cast at 6 Essence (the cap) are 3–13 a pull on the top players (영능턴종영능 3, Dreamsweet 5, Batchester 7–8, Fuexovoker 10, 식용드래곤 13) and 2–14 on the weak (Uvokerx 2, Snarkareth 4, Dwng 14): no separation. |
| evoker-augmentation/CoreRotation/active-time | superseded | `checkGcdGaps` | none | idle time | Downtime Good up to 5%, Ok up to 10%, Fail above, over the whole fight; forced downtime counts. The app values each gap less forced time. Not carried over. |
| evoker-augmentation/CoreRotation/cancelled-casts | covered | `checkInterrupts` | none | a cast cut by movement or a boss | Cancelled ÷ cast-time casts: Perfect at 1% or less, Fail above 5%. Counts boss interrupts and stuns as cancels. Engine note from the Devastation case: empower casts log their cast at the start beside the empowerstart and were read as cancelled; fixed in the engine (`timeline.ts`), but check the first Augmentation log for it, since Fire Breath and Upheaval are empowers here too. Phase 3 (2026-10-17): checked on all 31 player-pulls: only Eruption and Chrono Flames read as cancelled (Yùkîï 11, Simplevoker 7), never an empower. An empower re-pressed within ~1s logs two presses (Fire Breath 2:24.9 and 2:26.0 on Yùkîï); harmless here. |
| evoker-augmentation/Cooldown/cooldown-graph-missed-use | covered | `breathHeld`, `timeSkipHeld`, `prescienceCapped` (specs/augmentation.ts) | Time Skip; Tip the Scales | a gap long enough to fit a whole extra use | Visual only. Breath of Eons and Time Skip are covered as above, Prescience's every-gap mode by Prescience charges capped (new in phase 3, below). Tip the Scales is 90s under the recovery model (shortest 90.8s; it was "spread too far" only because Time Skip speeds it): not judged, its worth is an instant empower. Fire Breath and Upheaval are unmodelled (see Upheaval above and Fire Breath below). |
| evoker-augmentation/ProcBuffs/imminent-destruction-and-mass-eruption | candidate | — | Imminent Destruction; Scalecommander (Mass Eruption); Leaping Flames | a buff expiring unspent | Shared-layer per-proc verdicts: Imminent Destruction stacks and Mass Eruption stacks expiring or overcapping, a Leaping Flames charge decaying unspent. **Measured on Devastation:** 3 / 1 / 1 / 1 on a kill, each well under a GCD, not adopted. Phase 3 (2026-10-17), **not built, negligible:** nobody plays Scalecommander (no Mass Eruption). Removals with no consumer within 0.3s, 31 player-pulls: Imminent Destruction 6 of 106 (Shixxevo 2), Leaping Flames 0–4 of 7–13 a pull on top and weak alike (영능턴종영능 0, Dracman 3, Avelinna 4), each a fraction of a Chrono Flames' extra bounces. Neither has a clean duration to put in procs.ts (spans run to 37–43s with refreshes). Essence Burst, the spec's main proc, runs out unused 4 times in 666 gains (no cluster either): not added. |
| evoker-shared/Abilities/fire-breath-efficiency | candidate | — | Ashes in Motion; Interwoven Threads | Fire Breath held | Phase 2 marked it `wrong` because WoWAnalyzer's test applies the 95% target to Devastation only (a probable source bug). Phase 3 (2026-10-17) tested the rule itself, **overturned to candidate, not built (no cooldown model):** the top Vashnik players cast Fire Breath 2.65–3.04 times a minute alive (Batchester 2.80, Auwelas 3.04, Fuexovoker 2.70), the weak 2.25–2.47 (Snarkareth 2.25, Avelinna 2.37, Chiggen 2.38, Dwng 2.47), and a Fire Breath is worth ~110–210k of its own plus Inferno's Blessing (~6% of the Evoker's damage, ~350k a cast) and a 2s Ebon Might extension: ~0.5–1M a pull, the largest unpriced Augmentation lead. But no recharge fits: under the recovery model the shortest intervals sit at 22–24s with a median of 29s, and a 24s model reads 21–97s held a pull on the top players (Fuexovoker 97s) as on the weak. |
| evoker-augmentation/CoreRotation/guide-prose-no-grade | no-damage | — | Blistering Scales; Regenerative Chitin | — | Prose with no check behind it: keep Ebon Might, Prescience, Shifting Sands and Duplicate up, Breath in high-damage phases, Blistering Scales on the active tank. Upkeep is graphed, not graded; "high-damage phase" and "right tank" are not log-visible. Phase 3 (2026-10-17): the damage half of it is now judged by its own checks (Ebon Might down while ready, Prescience charges capped); the rest stays prose. |
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

After phase 3 (2026-10-17), in value order:

- **fire-breath-efficiency** (overturned from `wrong`): the top players
  cast ~0.4 more Fire Breaths a minute, ~0.5–1M a pull with Inferno's
  Blessing. Blocked on a recharge model: something besides Time Skip and
  Temporal Burst moves it (22–24s shortest, 29s median).
- **upheaval-efficiency**: ≤0.5M a pull; the same blocker plus resets.
- **ebon-might-uptime-in-window**, **window-potion-and-trinket**,
  **imminent-destruction-and-mass-eruption**: measured negligible.

Built in phase 3 (specs/augmentation.ts): Ebon Might down while ready
(from extend-inside-ebon-might and the guide's upkeep prose), Prescience
charges capped (the cooldown bar's every-gap mode), Breath of Eons and
Time Skip held (the two efficiency rows, rebuilt), Breath of Eons never
exploded (mob-died-early). Proposed `wrong`: window-empower-and-time-skip-use,
essence-at-cap.

Held for the user's review: the two proposed `wrong` rows above.
