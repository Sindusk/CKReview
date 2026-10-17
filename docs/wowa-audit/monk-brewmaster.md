# WoWAnalyzer audit: Brewmaster Monk

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Monk shared layer,
  then the spec), spot-checked at their source lines (4 of
  4 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares 12.1.0, fully maintained; last change 2026-10-01
  (Stormstout's Last Keg damage modifier). One priority list (a single
  Standard list), a guide with Stagger, Rotation & Cooldowns, Master of
  Harmony and Fortifying Brew sections, and no checklist. The spec is a
  tank, so the core melee-uptime figure sits in the Always Be Casting
  section. Several graded getters (Shuffle, Black Ox Brew, Breath of Fire
  hits, Energy at cap) have no consumer and never render.
- **App:** `lib/damage/wow/specs/tank.ts` has no Brewmaster damage check,
  only the note that Energy sat at 100 on 39 of 183 casts
  (xKP1M6gwC8WpnrBc pull 14) with the time at cap not in the log.
  `tracked-cooldowns.ts` tracks Exploding Keg (60s, 2 players, marked
  unverified); `potion.ts` and the generic checks (`checkGcdGaps`,
  `checkInterrupts`, `checkDeaths`) apply. No case study has been done on
  a Brewmaster: the app's header calls the spec unverified, so nothing
  below is `verified`.
- **Phase 3:** not started.
- **Core rules** (active time, cast efficiency, potions, cancelled casts,
  melee uptime) are in [core.md](core.md); rows below cover only what
  Brewmaster sets or adds. Monk class-layer rules (Touch of Death,
  Celestial Conduit) come from the shared layer and are noted where they
  apply.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| monk-brewmaster/AplCheck/shadopan-bof-during-niuzao | candidate | — | Wisdom of the Wall; Invoke Niuzao | Breath of Fire ready but another listed spell cast first while Niuzao is out | Priority entry, 40% skipped rule from core. Single-target logic; a Breath of Fire that was ready in forced time reads as skipped. Value it as the Breath of Fire casts missed inside each Niuzao window (the Ox's window is 25s; the spec's own premise is that each cast triggers Flurry Strikes), priced at the player's own Breath of Fire damage per cast plus the Flurry Strikes it adds. Separating a mistake from top play needs the top players' count per window: the source itself flags its expected count as unvalidated. Expect to fail the premise check. |
| monk-brewmaster/AplCheck/shadopan-ks-during-niuzao | superseded | — | Wisdom of the Wall; Invoke Niuzao | — | Sits second behind Breath of Fire in the same window; Keg Smash is a spec-author ordering choice. Whatever the window check above would measure covers it. |
| monk-brewmaster/AplCheck/charred-passions-setup | no-damage | — | Charred Passions | — | Only permits a Breath of Fire, never flags anything. A permission, not a rule. |
| monk-brewmaster/AplCheck/blackout-kick-first | superseded | `checkGcdGaps` | none | Blackout Kick ready but another listed spell cast | Blackout Kick is the first plain entry. Ordering inside a window where every GCD is filled changes little, and a missed Kick whose slot went empty shows as idle. Ordering costs are small for a rotation of 1s GCDs. |
| monk-brewmaster/AplCheck/bof-before-combo-tiger-palm | no-damage | — | Blackout Combo; Bring Me Another | — | Permission entry (Breath of Fire allowed before the combo Tiger Palm when Blackout Kick has 2s or more left). Flags nothing. |
| monk-brewmaster/AplCheck/tiger-palm-with-combo | superseded | `checkGcdGaps` | Blackout Combo | Combo buff up, a different spender cast | See Blackout Combo row below. The section text itself allows ignoring Combo while Niuzao is out as Shado-Pan, which this entry does not model. |
| monk-brewmaster/AplCheck/keg-smash-empty-barrel | superseded | `checkGcdGaps` | Bring Me Another | Empty Barrel up, a lower entry cast | Empty Barrel also resets Keg Smash in the model, so the ordering is nearly free. Not a damage loss of its own. |
| monk-brewmaster/AplCheck/keg-smash-at-two-charges-shadopan | candidate | — | Flurry Strikes; Stormstout's Last Keg | Keg Smash held at near-cap charges (1.8 or more modelled) | Charges are modelled, not logged. Value it as the Keg Smash casts lost to charge cap, using `chargesAt`/`cappedStretches` in checks.ts rather than the 1.8 line, at the player's own Keg Smash damage. Separating a mistake needs the second-charge talent confirmed from the player's cast intervals. Resources of this kind are cheap to measure but the loss is one Keg Smash at a time; likely small. |
| monk-brewmaster/AplCheck/breath-of-fire | superseded | `checkGcdGaps` | Breath of Fire | Keg Smash cast while Breath of Fire was ready | Plain ordering of two cooldown spells above Keg Smash. A held Breath of Fire is judged as a cooldown (below) and by the Niuzao window row. |
| monk-brewmaster/AplCheck/keg-smash | superseded | `checkGcdGaps` | Keg Smash | — | The last entry, the filler. Tiger Palm without Combo is never checked against the list, so this entry can only be skipped for a combo spender. |
| monk-brewmaster/Guide/graded-cooldown-bars (Exploding Keg) | covered | `checkCooldownDrift` (Exploding Keg, 60s, tracked-cooldowns.ts) | Exploding Keg | Exploding Keg held | Bar is good at 80% or more. WoWAnalyzer counts forced time as ready and expects the last use even when the fight ends first; the app counts whole lost uses less forced time. The tracked entry is marked unverified (9 casts, 2 players), so a case study should confirm the 60s before trusting a finding. |
| monk-brewmaster/Guide/graded-cooldown-bars (Invoke Niuzao) | candidate | — | Invoke Niuzao | Niuzao held | Not in tracked-cooldowns.ts and no comment says why (it wasn't in the 2-player survey list; the cooldown is 120s, 25s less with a talent, so it may have a talent-driven shorter interval). Value a missed use from the player's own Niuzao window: the Ox's damage plus the Breath of Fire casts and Flurry Strikes inside it. Not a Brew-recharge reduction case, so it needs only a measured interval. Mistake versus top play: top Brewmasters hold Niuzao for pulls and for burst phases, so check it against `cooldownHoldWindows` for the boss before building. |
| monk-brewmaster/Guide/graded-cooldown-bars (Chi Burst) | candidate | — | Chi Burst | Chi Burst held | A 30s cooldown that WoWAnalyzer grades; the changelog shows a pre-pull Chi Burst bug was fixed there. Low per-cast damage, and usually pressed on movement or in downtime. Phase 3 would likely show top players skipping it. Low value. |
| monk-brewmaster/InvokeNiuzao/wotw-triggers | candidate | — | Wisdom of the Wall | fewer than 6 Breath of Fire casts in a 25s summon | Box colour: perfect at 10 or more, good at 8, ok at 6. The source marks 8 as "made up in pre-patch". A forced stop inside the 25s counts against the player. Value it as the missed Breath of Fire casts times their damage, less forced time, but the benchmark itself is unvalidated: phase 3 should take the count from the top players' Niuzao windows first. Merges with the first priority row; build one check, not two. |
| monk-brewmaster/InvokeNiuzao/bof-ready-at-summon | unverifiable | — | Wisdom of the Wall | Breath of Fire on cooldown at summon with no Keg Smash charge | Reads a modelled Breath of Fire cooldown, and Breath of Fire is reset by Keg Smash through Salsalabim's Strength, a reduction the log doesn't show. Checklist line only. |
| monk-brewmaster/InvokeNiuzao/deterministic-resets | unverifiable | — | Wisdom of the Wall; Exploding Keg; Black Ox Brew; Celestial Brew / Infusion | resets spent or on cooldown at summon | Sums modelled cooldown states (all hard-coded, Keg Smash recharges estimated from the base cooldown). Checklist line only; nothing in the log shows the cooldown reductions it counts. |
| monk-brewmaster/InvokeNiuzao/bok-ready-at-summon | unverifiable | — | absence of Wisdom of the Wall | Niuzao used with Blackout Kick on cooldown | Blackout Kick's cooldown is shortened by Brew-side reductions the log doesn't show. Checklist line only. |
| monk-brewmaster/InvokeNiuzao/stomp-count | candidate | — | Fluidity of Motion; absence of Wisdom of the Wall | fewer than 4 Blackout Kicks in 25s | Stand-in count (Blackout Kick casts for Stomps, since there is no Stomp event). The expected count is 6, or 8 with Fluidity of Motion. Niuzao's direct damage is described by the source itself as low, so the value per missed Stomp is small. Would be valued from the Stomp damage if the log shows it, which the source never reads. Low value, and only for builds without Wisdom of the Wall. |
| monk-brewmaster/AspectOfHarmony/vitality-overcap | unverifiable | — | Aspect of Harmony; Way of a Thousand Strikes | Celestial Brew cast after a long stretch without spending | Vitality is a modelled estimate (a fraction of damage and healing done, an attack-power term for Purifying Brew, and Stagger tier), which the log shows none of directly; the source's own debug check accepts 15% model error. Spend timing, not rotation. |
| monk-brewmaster/AspectOfHarmony/damage-lost-to-deaths | candidate | — | Aspect of Harmony | Celestial Brew used into a target that dies or goes immune | The missing damage-over-time ticks are visible in part (ticks are logged), estimated from an expected 8 per target. Value it as the logged ticks short of the expected count on a spend that wasn't chained, which is boss-forced immunity too, so subtract forced windows. A boss that is immune by design makes this a mechanic, not a mistake; value is low and tied to Master of Harmony builds only. |
| monk-brewmaster/FortifyingBrew/per-use-grade | no-damage | — | Ironshell Brew | Fortifying Brew used with little incoming damage | A defensive graded by the damage it mitigated. Survival, not damage. For `lib/mitigation/`: the per-use mitigation figure (a fixed percentage of damage taken in the window) is the only part that could be reused, and it ignores Stagger. |
| monk-brewmaster/CelestialBrew/shield-use-grade | no-damage | — | Celestial Brew / Infusion | — | Shield wasted per cast. The module is not in the guide's defensive list, so the marks never render; the explanation strings also don't match the conditions. Dead for grading. |
| monk-brewmaster/Shuffle/hits-covered | no-damage | — | none | — | Share of hits taken with Shuffle up. Mitigation; unrendered. |
| monk-brewmaster/BlackoutCombo/spent-on-tiger-palm | candidate | — | Blackout Combo | Combo spent on something other than Tiger Palm | Unrendered getter, below 95 / 90 / 85%. Value from the log: a Combo spent on a different ability against the Tiger Palm it would have powered, priced by the player's own Tiger Palm with and without the buff. The source's tip text allows ignoring Combo while Niuzao is out as Shado-Pan but the getter has no exception, so a "wasted" Combo may be correct play. Likely fails phase 3. |
| monk-brewmaster/BlackOxBrew/wasted-cdr | unverifiable | — | Black Ox Brew | — | Share of the refunded Purifying Brew charges that were already ready. Modelled Purifying Brew cooldown; indirect and unrendered. |
| monk-brewmaster/BreathOfFire/mitigated-hits | no-damage | — | Breath of Fire | — | Share of hits taken from a target with the debuff. Mitigation; unrendered. The debuff uptime variant (whole fight, forced time counted) is also not graded. |
| monk-brewmaster/EnergyTracker/time-at-cap | unverifiable | — | none | Energy sitting at the cap | The log shows only casts made at the cap (core.md regen rule). The app's own tank.ts note records 39 of 183 casts at 100, with time at cap not visible. Nothing in the spec consumes the getter either. |
| monk-brewmaster/StaggerPoolGraph/elevated-purify | no-damage | — | High Tolerance; High Impact | Purifying Brew cast without Elevated Stagger | Colours graph markers, with an extra Purifying Brew charge as a side effect of the cooldown reduction. Survival; for `lib/mitigation/` it is the one rule a Stagger model could take (cast while the Elevated buff is up when High Tolerance is talented). |
| monk-brewmaster/Abilities/cast-efficiency-targets | covered | `checkCooldownDrift` | per ability | a tracked cooldown held past ready | Every spellbook entry uses the core 80% default with suggestions off; only the three bars above are visible. Keg Smash, Breath of Fire, Purifying Brew, Celestial Brew, Black Ox Brew and Empty the Cellar show casts against a maximum with no colour. The maximum for most depends on Brew reductions the log doesn't show (listed under Not rules), so those would stay `unverifiable` as bars. Exploding Keg is the only one tracked. |
| monk-shared/TouchOfDeath/cast-efficiency | candidate | — | Fatal Touch | Touch of Death cast fewer times than its execute-window maximum | Class layer, every Monk spec. Recommended 85%, 180s (90s with Fatal Touch), maximum raised by the time a target was under 15% health. Not tracked in tracked-cooldowns.ts for any Monk spec. A fixed 180s cooldown makes it a cheap candidate; value a lost use from the player's own Touch of Death damage. Subtract forced time and count only the targets the player could reach. WoWAnalyzer's maximum overstates by up to one use and counts forced time. Windwalker and Mistweaver share it, so decide it once, not here. |
| monk-brewmaster/Guide/core-downtime-section | superseded | `checkGcdGaps` | none | idle time and time out of melee | Core Always Be Casting; melee uptime for tanks cannot tell an untargetable boss from a player out of range. Whole-fight denominator, forced time counted active. Idle: superseded; melee uptime is the core `candidate` row in core.md. |
| monk-brewmaster/Guide/preparation-section | no-damage | — | none | — | Core consumables section; see the open question in core.md. |
| monk-brewmaster/statistics | no-damage | — | — | — | Display only: Effective Brew cooldown reduction (whole fight), High Tolerance and Blackout Combo counts, Celestial Brew average absorb, Anvil & Stave reduction, Stormstout's Last Keg damage and time saved, Scalding Brew bonus, Niuzao's Resolve and Vital Flames healing, Walk with the Ox, Gift of the Ox, the Stagger removal table by source, the Stagger pool plot with HP and deaths. Class-layer Mystic Touch, Save Them All and Veteran's Eye are display too. |
| monk-brewmaster/utility | no-damage | — | — | — | Utility and defensives (Fortifying Brew, Celestial Brew, Diffuse Magic dead code, Expel Harm, Stagger clears) are survival calls, not judged. |

Not rules (models the rules above rest on): the Brew cooldown model (Keg
Smash takes time off every Brew, more with Blackout Combo; Tiger Palm,
Empty the Cellar and Anvil & Stave also shorten it; High Tolerance and
Black Ox Brew reset or cut Purifying Brew; Exploding Keg and Empty Barrel
reset Keg Smash; Keg Smash resets Breath of Fire with Salsalabim's
Strength) and the Shared Brews reducer, the Energy tracker, the Stagger
pool model with per-source clear links and its debug tick check, the
Mantra of Purity prevention, Expel Harm orb, Vital Flame, Celestial Brew
absorb, Breath of Fire debuff-target and primary-target normalizers, the
Aspect of Harmony link, High Tolerance elevated-buff history, the mean
haste tracker, timeline highlights, shared constants (a Stagger
effectiveness figure and a damage-modifier whitelist: table, not
extracted), and the Celestial Conduit and Heart of the Jade Serpent
helpers on the class layer. The Diffuse Magic analyzer is dead code,
never enabled.

The class-layer Celestial Conduit rows (channel, Unity Within cooldowns,
targets hit, cast rating) are Windwalker and Mistweaver hero-tree rules
and do not apply to a Brewmaster; they are judged in those ledgers.

## Candidates left

None has been measured. Ordered by expected value, honest about it:

1. **Niuzao window count** (merges the first priority row, Wisdom of the
   Wall trigger count and the Niuzao bar): Breath of Fire casts in each
   25s summon against top players' windows. Only candidate with real
   damage behind it, but the source's own benchmark is unvalidated, so
   phase 3 must measure the top count before anything is built.
2. **Touch of Death** cast efficiency: cheap and shared by all Monks, but
   decide it in the Windwalker ledger first.
3. **Keg Smash charge cap**: the charge model exists in checks.ts; small
   per-cast loss.
4. **Invoke Niuzao as a tracked cooldown**: needs a measured interval;
   mistake versus a deliberate hold is the question.
5. **Blackout Combo spent elsewhere**, **stomp count**, **Aspect of
   Harmony damage lost to deaths**, **Chi Burst efficiency**: low value,
   probably fail the premise check.
