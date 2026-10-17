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
- **Phase 3:** done 2026-10-17 (Claude Opus 5.5). Four kills fetched
  (one fight each, ~230 WCL points with rankings and three probes), five
  on disk; all Mythic, 9 player-pulls:
  - top: Fluffytail (kZnVcJYpKFRChTzb, Vashnik 100th), Melstout
    (PCMfNtnbrVxpwYhk, Vashnik 99.7th), Bus (th1Ap4QrBPJyma23, Vashnik
    99.5th), Blueregard (zpRGrxBgjJH7A3yk, Nek'zali 100th);
  - weaker, Vashnik: Kegroit (Ftj4vwHf9RazPcqV), Lootchi
    (a4kX1DNT27yHGvqJ), Fluffÿ (r9CX1kpRGLmKJH4M), Sinamonk
    (zdyhBj7pxWG6A8QZ), Qywsi (VbAHWZDdPwJBajmx, 21st percentile);
    probed only: Revacholiere (PxyRY4dMkzTAj8Cv fight 6), Cptnbrew
    (1brDXnpJctNQ6YxT fight 15), Ruchei (BLAQWkjx8Jny6H4m fight 10),
    Nek'zali ~20th.

  Talents, from casts, buffs and hits (CombatantInfo's talent tree holds
  entry ids with no names): seven play Shado-Pan (Flurry Strikes),
  Kegroit and Qywsi Master of Harmony; everyone has Blackout Combo,
  Exploding Keg, Invoke Niuzao and the Keg Smash → Breath of Fire reset;
  Fuel on the Fire on six, Empty the Cellar on seven, Chi Burst on eight.
  Built (`lib/damage/wow/specs/brewmaster.ts`, wired from tank.ts):
  **Breath of Fire reset lost**: no Breath of Fire was pressed twice
  without a Keg Smash between (0 of 661), so a Keg Smash pressed while
  the last one's Breath of Fire is unpressed wastes one (37–52k a press;
  stretches with an idle GCD are left to the gap check). Top 37–52k a
  pull (Fluffytail 240k), weaker Qywsi 656k, Sinamonk 556k, Fluffÿ 285k.
  Tracked cooldowns: **Exploding Keg** now counts its later hits and Fuel
  on the Fire (a use was 97k, now 150–400k) and is `burstHold` (Melstout
  holds it to each Vashnik Venom wave: 2 "lost" uses were that);
  **Invoke Niuzao** added at 120s (95s with a talent the log doesn't
  show), valued by its hits and the Flurry Strikes its window adds
  (0.84–1.39M a use on Shado-Pan); fires on no sample player. No proc
  expires: Blackout Combo, Empty Barrel, Fuel on the Fire and Empty the
  Cellar were always spent (0 unused of 624, 228, 36, 39). Survey: GCD
  uptime 89–93% on the top players, nothing unlisted before a gap.
  Mitigation leads for `lib/mitigation/` (not built): Breath of Fire's
  debuff (the target hits the Monk for less) is up only while the
  rotation above holds, so a lost reset is also lost mitigation;
  Celestial Infusion, Purifying Brew and Black Ox Brew casts (8–17,
  22–62, 0–7 a pull) and Elevated Stagger are in the buff stream for a
  Stagger model.
- **Core rules** (active time, cast efficiency, potions, cancelled casts,
  melee uptime) are in [core.md](core.md); rows below cover only what
  Brewmaster sets or adds. Monk class-layer rules (Touch of Death,
  Celestial Conduit) come from the shared layer and are noted where they
  apply.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| monk-brewmaster/AplCheck/shadopan-bof-during-niuzao | superseded | Breath of Fire reset lost (brewmaster.ts) | Wisdom of the Wall; Invoke Niuzao | Breath of Fire ready but another listed spell cast first while Niuzao is out | Priority entry, 40% skipped rule from core. Single-target logic; a Breath of Fire that was ready in forced time reads as skipped. Value it as the Breath of Fire casts missed inside each Niuzao window (the Ox's window is 25s; the spec's own premise is that each cast triggers Flurry Strikes), priced at the player's own Breath of Fire damage per cast plus the Flurry Strikes it adds. Separating a mistake from top play needs the top players' count per window: the source itself flags its expected count as unvalidated. Expect to fail the premise check. Phase 3 (2026-10-17): Breath of Fire comes only from Keg Smash resets (0 of 661 presses without one between), so "ready" means "a Keg Smash since the last one", and a skipped one shows as two Keg Smashes in a row, inside Niuzao or not. That is the built check (`breath-of-fire` row). Its Niuzao-only part adds the Flurry Strikes, left out of the price (lower bound). |
| monk-brewmaster/AplCheck/shadopan-ks-during-niuzao | superseded | — | Wisdom of the Wall; Invoke Niuzao | — | Sits second behind Breath of Fire in the same window; Keg Smash is a spec-author ordering choice. Whatever the window check above would measure covers it. |
| monk-brewmaster/AplCheck/charred-passions-setup | no-damage | — | Charred Passions | — | Only permits a Breath of Fire, never flags anything. A permission, not a rule. |
| monk-brewmaster/AplCheck/blackout-kick-first | superseded | `checkGcdGaps` | none | Blackout Kick ready but another listed spell cast | Blackout Kick is the first plain entry. Ordering inside a window where every GCD is filled changes little, and a missed Kick whose slot went empty shows as idle. Ordering costs are small for a rotation of 1s GCDs. |
| monk-brewmaster/AplCheck/bof-before-combo-tiger-palm | no-damage | — | Blackout Combo; Bring Me Another | — | Permission entry (Breath of Fire allowed before the combo Tiger Palm when Blackout Kick has 2s or more left). Flags nothing. |
| monk-brewmaster/AplCheck/tiger-palm-with-combo | superseded | `checkGcdGaps` | Blackout Combo | Combo buff up, a different spender cast | See Blackout Combo row below. The section text itself allows ignoring Combo while Niuzao is out as Shado-Pan, which this entry does not model. |
| monk-brewmaster/AplCheck/keg-smash-empty-barrel | superseded | `checkGcdGaps` | Bring Me Another | Empty Barrel up, a lower entry cast | Empty Barrel also resets Keg Smash in the model, so the ordering is nearly free. Not a damage loss of its own. |
| monk-brewmaster/AplCheck/keg-smash-at-two-charges-shadopan | unverifiable | — | Flurry Strikes; Stormstout's Last Keg | Keg Smash held at near-cap charges (1.8 or more modelled) | Charges are modelled, not logged. Value it as the Keg Smash casts lost to charge cap, using `chargesAt`/`cappedStretches` in checks.ts rather than the 1.8 line, at the player's own Keg Smash damage. Separating a mistake needs the second-charge talent confirmed from the player's cast intervals. Resources of this kind are cheap to measure but the loss is one Keg Smash at a time; likely small. Phase 3 (2026-10-17): **can't be fitted from the log**. Keg Smash presses come as close as 1.0s apart on five of nine players (two charges, or Empty Barrel / Exploding Keg resets: Empty Barrel's buff 1265307 was spent by a Keg Smash 228 times), so no recharge line holds. Rates don't separate either: top 11.7–13.5 a minute (Fluffytail 11.7), weaker 11.2–12.8. A lost Keg Smash is ~70k plus the Breath of Fire it resets. |
| monk-brewmaster/AplCheck/breath-of-fire | verified | Breath of Fire reset lost (brewmaster.ts) | Breath of Fire | Keg Smash cast while Breath of Fire was ready | Plain ordering of two cooldown spells above Keg Smash. A held Breath of Fire is judged as a cooldown (below) and by the Niuzao window row. Phase 3 (2026-10-17), **was `superseded`, now built**: a Keg Smash press fills the GCD, so the gap check never saw this. Breath of Fire is ready only after a Keg Smash (0 of 661 presses without one between, 9 player-pulls), so a Keg Smash pressed while it's ready wastes the reset. Valued at the player's Breath of Fire a press (its hit and Dragonfire Brew, 37–52k; DoT and Niuzao's Flurry Strikes left out); a stretch with an idle GCD in it is left to the gap check. Top: Melstout 52k (PCMfNtnbrVxpwYhk, 1:52), Bus 44k, Blueregard 37k, Fluffytail 240k (5; three are a Keg Smash, Celestial Infusion, Keg Smash: 3:42, 5:50, 6:49). Weaker: Qywsi 656k (VbAHWZDdPwJBajmx, 15 counted of 28; 0:53 two Keg Smashes 1.0s apart), Sinamonk 556k (13), Fluffÿ 285k (6), Kegroit 43k, Lootchi 0. Probe: Revacholiere (20th) 61 Keg Smashes, 50 Breaths of Fire. |
| monk-brewmaster/AplCheck/keg-smash | superseded | `checkGcdGaps` | Keg Smash | — | The last entry, the filler. Tiger Palm without Combo is never checked against the list, so this entry can only be skipped for a combo spender. |
| monk-brewmaster/Guide/graded-cooldown-bars (Exploding Keg) | covered | `checkCooldownDrift` (Exploding Keg, 60s, tracked-cooldowns.ts) | Exploding Keg | Exploding Keg held | Bar is good at 80% or more. WoWAnalyzer counts forced time as ready and expects the last use even when the fight ends first; the app counts whole lost uses less forced time. The tracked entry is marked unverified (9 casts, 2 players), so a case study should confirm the 60s before trusting a finding. Phase 3 (2026-10-17), **verified, value and holds fixed**: shortest 60.0–61.3s on seven of nine players (median 62–70s). A use was priced by its first hit (325153) alone; its later hits (388867) and the Fuel on the Fire hits its buff (1262035) gives the next Keg Smashes (1262159, all within 12s of a Keg) now count: 59–131k plus 49–269k a use. Melstout (99.7th, PCMfNtnbrVxpwYhk) read 2 lost uses (47k): he and Lootchi press it at the end of each Vashnik hold window (0:27, 1:54, 3:19, 4:42, 6:03), when the Venoms give Fuel on the Fire three targets (Melstout 226–412k on the first four, 45k on two targets at 6:03 of Fuel a use, Fluffytail 49–359k); now `burstHold`, and he reads none. Left: Qywsi 45k (1 use, 38.6s held), nobody else. |
| monk-brewmaster/Guide/graded-cooldown-bars (Invoke Niuzao) | verified | — | Invoke Niuzao | Niuzao held | Not in tracked-cooldowns.ts and no comment says why (it wasn't in the 2-player survey list; the cooldown is 120s, 25s less with a talent, so it may have a talent-driven shorter interval). Value a missed use from the player's own Niuzao window: the Ox's damage plus the Breath of Fire casts and Flurry Strikes inside it. Not a Brew-recharge reduction case, so it needs only a measured interval. Mistake versus top play: top Brewmasters hold Niuzao for pulls and for burst phases, so check it against `cooldownHoldWindows` for the boss before building. Phase 3 (2026-10-17), **built as a tracked cooldown** (`checkCooldownDrift`, tracked-cooldowns.ts): shortest interval 95.0–97.1s on the seven Shado-Pan players, 121.0 / 120.4s on the two Master of Harmony (Kegroit, Qywsi: no talent), and the talent isn't in the log, so it's tracked at 120s (lenient for the 95s players). Valued by `niuzaoValue` (brewmaster.ts): Niuzao's hits a use (89–238k) plus the Flurry Strikes the window adds on Shado-Pan (47–83k/s inside vs 14–21k/s outside, 0.79–1.38M a use), less a GCD: 0.84–1.39M a use, 31–87k on Master of Harmony. Nobody holds it for a fight window. Fires on no sample player: the top press it every 95–99s, the weaker's longest gap is 135s (Qywsi); the 20th-percentile Revacholiere (probe, PxyRY4dMkzTAj8Cv) pressed it at 0:19 and 3:27 only, 82s held at 120s (one lost use at 95s, if he takes the talent). |
| monk-brewmaster/Guide/graded-cooldown-bars (Chi Burst) | candidate | — | Chi Burst | Chi Burst held | A 30s cooldown that WoWAnalyzer grades; the changelog shows a pre-pull Chi Burst bug was fixed there. Low per-cast damage, and usually pressed on movement or in downtime. Phase 3 would likely show top players skipping it. Low value. Phase 3 (2026-10-17), **measured, not built (negligible)**: shortest interval 30.9–34.8s; a press hits for 49–111k (its 148135 hits; Qywsi 203k on adds) against a 58–79k average GCD, so a skipped press is worth 0–30k. The top players differ widely: Fluffytail 13 presses in 7:09, Melstout 7 in 6:40, Blueregard 6 in 6:00 (every 63s); Sinamonk takes Chi Wave instead. |
| monk-brewmaster/InvokeNiuzao/wotw-triggers | wrong | — | Wisdom of the Wall | fewer than 6 Breath of Fire casts in a 25s summon | Box colour: perfect at 10 or more, good at 8, ok at 6. The source marks 8 as "made up in pre-patch". A forced stop inside the 25s counts against the player. Value it as the missed Breath of Fire casts times their damage, less forced time, but the benchmark itself is unvalidated: phase 3 should take the count from the top players' Niuzao windows first. Merges with the first priority row; build one check, not two. Phase 3 (2026-10-17), **proposed `wrong`** (the user reviews it after every spec's pass): the count doesn't separate. Breath of Fire casts per 25s window: Fluffytail (100th, kZnVcJYpKFRChTzb) 5, 6, 4, 4, 4; Melstout 9, 5, 8, 5; Bus 10, 5, 5, 5; Blueregard 9, 5, 7, 7; the weaker Lootchi 5, 5, 4, 6, Fluffÿ 5 in every window, Sinamonk 6, 3, 4, 3. The 6 line flags the 100th-percentile player in three of five windows. The count is capped by Keg Smash resets (Breath of Fire only follows a Keg Smash); the part that's a mistake, a reset skipped, is the built Breath of Fire reset check, inside Niuzao or not. |
| monk-brewmaster/InvokeNiuzao/bof-ready-at-summon | unverifiable | — | Wisdom of the Wall | Breath of Fire on cooldown at summon with no Keg Smash charge | Reads a modelled Breath of Fire cooldown, and Breath of Fire is reset by Keg Smash through Salsalabim's Strength, a reduction the log doesn't show. Checklist line only. |
| monk-brewmaster/InvokeNiuzao/deterministic-resets | unverifiable | — | Wisdom of the Wall; Exploding Keg; Black Ox Brew; Celestial Brew / Infusion | resets spent or on cooldown at summon | Sums modelled cooldown states (all hard-coded, Keg Smash recharges estimated from the base cooldown). Checklist line only; nothing in the log shows the cooldown reductions it counts. |
| monk-brewmaster/InvokeNiuzao/bok-ready-at-summon | unverifiable | — | absence of Wisdom of the Wall | Niuzao used with Blackout Kick on cooldown | Blackout Kick's cooldown is shortened by Brew-side reductions the log doesn't show. Checklist line only. |
| monk-brewmaster/InvokeNiuzao/stomp-count | candidate | — | Fluidity of Motion; absence of Wisdom of the Wall | fewer than 4 Blackout Kicks in 25s | Stand-in count (Blackout Kick casts for Stomps, since there is no Stomp event). The expected count is 6, or 8 with Fluidity of Motion. Niuzao's direct damage is described by the source itself as low, so the value per missed Stomp is small. Would be valued from the Stomp damage if the log shows it, which the source never reads. Low value, and only for builds without Wisdom of the Wall. Phase 3 (2026-10-17), **measured, not built (negligible)**: Niuzao's own Stomp (pet, 227291) is 0.2–1.0M a pull (0.4–1.5% of the player's damage), 89–238k a summon with its melee. Who takes Wisdom of the Wall can't be read directly (the seven Shado-Pan players get its Flurry Strikes, so they take it); the two Master of Harmony players press 4–6 Blackout Kicks a window (Kegroit 5, 6, 4, 6; Qywsi 4, 5, 5) for 106–162k of Niuzao a summon. A missing Stomp is a few thousand. |
| monk-brewmaster/AspectOfHarmony/vitality-overcap | unverifiable | — | Aspect of Harmony; Way of a Thousand Strikes | Celestial Brew cast after a long stretch without spending | Vitality is a modelled estimate (a fraction of damage and healing done, an attack-power term for Purifying Brew, and Stagger tier), which the log shows none of directly; the source's own debug check accepts 15% model error. Spend timing, not rotation. |
| monk-brewmaster/AspectOfHarmony/damage-lost-to-deaths | candidate | — | Aspect of Harmony | Celestial Brew used into a target that dies or goes immune | The missing damage-over-time ticks are visible in part (ticks are logged), estimated from an expected 8 per target. Value it as the logged ticks short of the expected count on a spend that wasn't chained, which is boss-forced immunity too, so subtract forced windows. A boss that is immune by design makes this a mechanic, not a mistake; value is low and tied to Master of Harmony builds only. Phase 3 (2026-10-17): **not measured**. Two Master of Harmony player-pulls (Kegroit, Qywsi, both Vashnik); Aspect of Harmony's ticks (450763) are 1.3–2.6M a pull, but tying ticks to the spend that started them needs the Vitality model this row's neighbour calls unverifiable. Left as a candidate for a pass with more Master of Harmony logs. |
| monk-brewmaster/FortifyingBrew/per-use-grade | no-damage | — | Ironshell Brew | Fortifying Brew used with little incoming damage | A defensive graded by the damage it mitigated. Survival, not damage. For `lib/mitigation/`: the per-use mitigation figure (a fixed percentage of damage taken in the window) is the only part that could be reused, and it ignores Stagger. |
| monk-brewmaster/CelestialBrew/shield-use-grade | no-damage | — | Celestial Brew / Infusion | — | Shield wasted per cast. The module is not in the guide's defensive list, so the marks never render; the explanation strings also don't match the conditions. Dead for grading. |
| monk-brewmaster/Shuffle/hits-covered | no-damage | — | none | — | Share of hits taken with Shuffle up. Mitigation; unrendered. |
| monk-brewmaster/BlackoutCombo/spent-on-tiger-palm | wrong | — | Blackout Combo | Combo spent on something other than Tiger Palm | Unrendered getter, below 95 / 90 / 85%. Value from the log: a Combo spent on a different ability against the Tiger Palm it would have powered, priced by the player's own Tiger Palm with and without the buff. The source's tip text allows ignoring Combo while Niuzao is out as Shado-Pan but the getter has no exception, so a "wasted" Combo may be correct play. Likely fails phase 3. Phase 3 (2026-10-17), **proposed `wrong`** (for the user's review): the loss per Combo is real, a Tiger Palm with it hits 2–3× one without (per target: Melstout 127k vs 63k, Fluffytail 139k vs 48k) and a Keg Smash gains nothing from it (78k vs 82k). No Combo ran out (0 of 624). But the top players spend it on Keg Smash too: outside Niuzao Melstout (99.7th, PCMfNtnbrVxpwYhk) 15 (0:40, 0:59, 1:15 …), Blueregard 7, Bus 5, Fluffytail 1; the weaker Fluffÿ 23, Sinamonk 23, Qywsi 8, Kegroit 3, Lootchi 1. Melstout's Keg Smash-first order goes with the most Keg Smashes and Breath of Fire resets (90 / 90 in 6:40), and holding the Keg Smash for the Tiger Palm can cost a reset or a charge, which the log can't price. Priced at the Tiger Palm difference it reads ~0.96M on Melstout against 0.8–1.0M on Fluffÿ and Sinamonk: fires on the top as on the weak. |
| monk-brewmaster/BlackOxBrew/wasted-cdr | unverifiable | — | Black Ox Brew | — | Share of the refunded Purifying Brew charges that were already ready. Modelled Purifying Brew cooldown; indirect and unrendered. |
| monk-brewmaster/BreathOfFire/mitigated-hits | no-damage | — | Breath of Fire | — | Share of hits taken from a target with the debuff. Mitigation; unrendered. The debuff uptime variant (whole fight, forced time counted) is also not graded. |
| monk-brewmaster/EnergyTracker/time-at-cap | unverifiable | — | none | Energy sitting at the cap | The log shows only casts made at the cap (core.md regen rule). The app's own tank.ts note records 39 of 183 casts at 100, with time at cap not visible. Nothing in the spec consumes the getter either. Phase 3 (2026-10-17): casts at 100 Energy are 17–25% of the top players' (Fluffytail 96 of 488, Bus 89 of 352) and 10–28% of the weaker players' (Sinamonk 38 of 388, Qywsi 95 of 334): doesn't separate; no Energy check exists for the spec, none added. |
| monk-brewmaster/StaggerPoolGraph/elevated-purify | no-damage | — | High Tolerance; High Impact | Purifying Brew cast without Elevated Stagger | Colours graph markers, with an extra Purifying Brew charge as a side effect of the cooldown reduction. Survival; for `lib/mitigation/` it is the one rule a Stagger model could take (cast while the Elevated buff is up when High Tolerance is talented). |
| monk-brewmaster/Abilities/cast-efficiency-targets | covered | `checkCooldownDrift` | per ability | a tracked cooldown held past ready | Every spellbook entry uses the core 80% default with suggestions off; only the three bars above are visible. Keg Smash, Breath of Fire, Purifying Brew, Celestial Brew, Black Ox Brew and Empty the Cellar show casts against a maximum with no colour. The maximum for most depends on Brew reductions the log doesn't show (listed under Not rules), so those would stay `unverifiable` as bars. Exploding Keg is the only one tracked. |
| monk-shared/TouchOfDeath/cast-efficiency | candidate | — | Fatal Touch | Touch of Death cast fewer times than its execute-window maximum | Class layer, every Monk spec. Recommended 85%, 180s (90s with Fatal Touch), maximum raised by the time a target was under 15% health. Not tracked in tracked-cooldowns.ts for any Monk spec. A fixed 180s cooldown makes it a cheap candidate; value a lost use from the player's own Touch of Death damage. Subtract forced time and count only the targets the player could reach. WoWAnalyzer's maximum overstates by up to one use and counts forced time. Windwalker and Mistweaver share it, so decide it once, not here. Phase 3 (2026-10-17), **measured, not built** (as for Windwalker): a press is worth 0.43–1.43M on Brewmaster, 0.7–3% of the player's damage each, always on an enemy at 4–21% (Burning / Shrouded Venoms on Vashnik, Restless Amani on Nek'zali; `_scratch/brm-tod.js`). Presses: top 2–3 (Fluffytail 2 in 7:09, Melstout 2, Bus 2, Blueregard 3), weaker 1–4 (Kegroit 4, Lootchi 3, Sinamonk 2, Fluffÿ 1, Qywsi 1). On a 90s model every player, the top included, leaves low Venoms with it ready (Fluffytail 16 stretches, Melstout 19, Qywsi 24), each 2–5s on adds that die fast, and the real cooldown isn't confirmed (shortest 93.9s, Lootchi). |
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

After phase 3 (2026-10-17), measured and left unbuilt:

1. **Touch of Death** (0.43–1.43M a press): every player, top included,
   lets low Venoms go with it ready; needs the real cooldown and the
   enemies a tank can reach. Decided with Windwalker's.
2. **Aspect of Harmony damage lost to deaths**: not measured, two Master
   of Harmony player-pulls only.
3. **Chi Burst**, **Stomp count**: negligible (0–30k a press, a few
   thousand a Stomp).

Proposed `wrong` for the user's review: the Wisdom of the Wall count and
Blackout Combo on Keg Smash, evidence in their rows. Keg Smash charges
are `unverifiable`.
