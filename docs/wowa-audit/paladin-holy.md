# WoWAnalyzer audit: Holy Paladin

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Paladin shared layer,
  then the spec), spot-checked at their source lines (4 of
  4 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares patch 12.0 while the clone is 12.1.0, so the spec is
  **lagging** by one minor. Marked partially maintained, one listed
  contributor; last change 2026-09-28 (Beacon of Virtue window analysis).
  Midnight support began 2026-01-03; most reworks are dated 2026-07-16 and
  2026-07-17. Rules for talents that have since changed (Moment of
  Compassion, Beacon of the Savior, Imbued Infusions' spender list, Crusader's
  Might's target) are doubtful in the notes, not candidates.
  **Almost no numeric threshold is live.** The spec is guide-based and only
  grades Perfect / Good / Ok / Fail; the old threshold getters in Overhealing,
  Mastery Effectiveness, Filler Flash of Light, Crusader's Might, Imbued
  Infusion and Beacon Uptime have no consumer (dead). The guide itself says its
  priority list "cannot see the damage you were reacting to" and is not a
  score: Holy is treated as a reactive healer.
- **App:** `lib/damage/wow/specs/healer.ts` (`"Holy Paladin"` runs only
  `HEALER_CHECKS`, the heal-GCD check: a heal GCD whose effective share is
  under 20% is valued at the healer's damage filler, marked inference),
  `potion.ts` and the generic checks. **No Holy Paladin entry in
  `tracked-cooldowns.ts`**, so cooldown drift does not fire for it, and
  `spenderSnapshotWaste` (Holy Power) is wired for Retribution only
  (`melee.ts`). The sample survey in `spell-data.ts` has 9 Holy Paladin
  players (observed GCD 1.2s). No case study exists for Holy Paladin;
  nothing here is `verified`.
- **Phase 3:** done 2026-10-17 (healer pass with Discipline and Holy
  Priest): no candidate built; the heal-GCD check's filler fixed
  (healer.ts). Evidence per row in "Phase 3 (2026-10-17)" below. The
  `wrong` and `no-damage` proposals wait for the user's review.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Holy sets or adds.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| paladin-holy/AlwaysBeCasting/active-time | superseded | `checkGcdGaps` | Crusader's Might (adds Crusader Strike to the healing list) | idle time | The guide grades healing uptime at a lax 70%-of-active-time Good, no tier below; the healer base class carries 20 / 35% downtime and 30 / 40 / 45% non-healing-time thresholds. Whole fight, Stasis included. The non-healing share is a healing-shape display, not damage. |
| paladin-holy/HolyPowerOverview/holy-power-waste | no-damage | — (`spenderSnapshotWaste` exists, Ret only) | none | builders cast at 5 Holy Power or into a proc | Waste above 2 / 5 / 8% (the class threshold). Holy Power is logged on spenders only, so the app would rebuild it as it does for Retribution (41.9% vs 33.5% on Polpo, 12.9% vs 10.4% on a 99th-percentile Ret: ~80% of WoWAnalyzer's figure). **Value is the problem:** Holy's spenders are mostly heals (Eternal Flame 623 casts, Light of Dawn 229, Shield of the Righteous 27 in the survey), so "damage per unit spent" is near zero. A usable value is a spender GCD at the healer's filler damage, which is a stretch. The fit needs 15 uncapped intervals and 20 costed spends per player. Likely fails phase 3: a reactive healer spends when someone needs it. |
| paladin-holy/AplCheck/apl-cap-spend | superseded | — | Eternal Flame (swaps Word of Glory) | a non-spender cast at 5 Holy Power | Spend at 5, any of three spenders satisfies it. Same loss as the waste row above. Pre-pull casts are ignored by the checker; "frequently skipped" is over 40% of chances. |
| paladin-holy/AplCheck/apl-infusion-flash | no-damage | — | Infusion of Light | Holy Shock or a spender cast with a proc banked | Spend the proc on Flash of Light before anything below the cap rule. A choice between heals. Outranking Holy Shock is unusual and doubtful at 12.1. Judgment may spend a proc per the guide text but is not on the list. |
| paladin-holy/AplCheck/apl-holy-shock | superseded | — | Holy Shock; Light's Conviction (+1 charge) | a spender at 3-4 Holy Power or a Flash of Light chosen while Holy Shock was ready | Holy Shock whenever ready. The app's version would be the Holy Shock cast-efficiency row below; readiness comes from a modelled cooldown, not the log. |
| paladin-holy/AplCheck/apl-spend | no-damage | — | none | a Flash of Light at 3-4 Holy Power with no proc | Spend at 3 or more. Assumes a fixed cost of 3; only a Flash of Light can break it. Healing choice. |
| paladin-holy/AplCheck/apl-filler-flash | no-damage | — | none | never | The bottom filler; cannot be violated. Judgment, Crusader Strike, Hammer of Wrath, Divine Toll, Holy Prism, Holy Light and Beacon of Virtue are not on the list, so the checker is silent about them. |
| paladin-holy/HolyShock/cast-efficiency | no-damage | — | Holy Shock; Light's Conviction; Sanctified Wrath (shorter while Avenging Wrath is up) | Holy Shock held off cooldown | 80% target, 75 / 65 below. **Not trackable as a plain recast:** survey intervals run 1.06s shortest, 4.0s median (793 casts), so charges, haste and reductions dominate and `tracked-cooldowns.ts` would invent drift. It would be a `spentCooldownDrift` rule with a reduction per event: about 1s per Imbued Infusions rank on each Flash of Light, Holy Light or Judgment cast with an Infusion of Light proc up (`reduceOn`), and a shorter recharge while Avenging Wrath is up. Both reductions are server-side and depend on patch-doubtful talents. Value of a lost cast: a Holy Shock heal or an enemy-target hit; the heal share is unknowable without need. Phase 3 would value a lost cast from the player's own Holy Shock hits, and ask whether top players leave it ready (they hold it for healing need). Low expected value. |
| paladin-holy/HolyPrism/cast-target | no-damage | — | Holy Prism | Holy Prism cast on a friendly | Enemy target is Good (AoE heal), friendly Ok. A healing rule. Holy Prism does not appear in the 9-player survey, so it is rarely taken. |
| paladin-holy/HolyPrism/cast-efficiency | no-damage | — | Holy Prism | Holy Prism held | 80% default, 30s. A heal cooldown; no survey casts. |
| paladin-holy/BeaconOfVirtue/window-active-time | no-damage | `checkGcdGaps` | Beacon of Virtue | idle inside the 9s window | Perfect at 100% active, Good 75%, Ok 50%, Fail below. A healing window: idle there costs healing, not damage, and forced movement counts as idle. |
| paladin-holy/BeaconOfVirtue/raid-cooldown-bump | no-damage | — | Beacon of Virtue, Divine Toll, Aura Mastery, Ringing of the Heavens | a window without the cooldown | One tier up for stacking Divine Toll or Aura Mastery in the window (off on Mythic+). Stacking healing cooldowns. |
| paladin-holy/BeaconOfVirtue/infused-flash-on-beacon | no-damage | — | Beacon of Virtue, Moment of Compassion, Infusion of Light, Beacon of the Savior | an infused Flash of Light on a non-beacon target | Healing target choice. Moment of Compassion and Beacon of the Savior are new talents; doubtful at 12.1. |
| paladin-holy/BeaconOfVirtue/divine-toll-aura-mastery-stats | no-damage | — | Divine Toll, Aura Mastery, Ringing of the Heavens | a window without the cooldown | Yes/no tiles, never Fail; does not check whether the cooldown was available. |
| paladin-holy/BeaconOfVirtue/cast-efficiency | no-damage | — | Beacon of Virtue | held | Mana-gated healing cooldown (15s declared; survey 15.0s shortest, 17.4s median over 161 casts). The guide says to save it for need, which contradicts the 80% colour. |
| paladin-holy/FlashOfLightUsage/hard-cast | no-damage | `healGcds` (overheal part only) | Infusion of Light | Flash of Light cast without a proc | Every proc-less Flash of Light is Fail. A heal-versus-mana call, absolute and ignores emergencies. The app's heal-GCD check values the overhealed ones, which is the only part with a damage price. |
| paladin-holy/FlashOfLightUsage/target-beacon | no-damage | — | Moment of Compassion, Beacon of the Savior, Infusion of Light | a proc spent off the Savior target | Perfect on the Savior target, Ok elsewhere. Text calls it a preference; doubtful at 12.1. |
| paladin-holy/FillerFlashOfLight/filler-fol-while-holy-shock-ready | no-damage | `healGcds` (overheal part only) | Infusion of Light, Holy Shock | a hard-cast Flash of Light with Holy Shock ready (or ready within 200 ms) | The one live timeline annotation. Readiness comes from the modelled Holy Shock cooldown. A choice between heals; the dead getter counts per fight minute. |
| paladin-holy/BeaconOverview/direct-beacon-healing | no-damage | — | none | heals aimed at a beacon holder | Share of beacon-transferring hits landing on a holder, lower is better: Perfect at 20% or less, Good 25%, Ok 35%. Counts hits not amounts, and penalises tank-beacon heals in tank phases. Healing. |
| paladin-holy/BeaconUptime/beacon-uptime | no-damage | — | Beacon of Faith, Beacon of Virtue | a beacon missing | Dead getters (90% for Light and Faith; 25 / 15 / 10% for Virtue). Applied time over the whole fight, Stasis and pre-pull included. Healing. |
| paladin-holy/MasteryEffectiveness/mastery-effectiveness | no-damage | — | none | — | Healing-weighted distance to the target. Dead getter (75 / 70 / 60%). Position is largely set by mechanics, which the app treats as forced; not judged. |
| paladin-holy/Overhealing/overheal-thresholds | covered | `healGcds` | Divine Purpose (raises two) | — | Dead getters: Light of Dawn above 40 / 50 / 60%, Holy Shock heal above 35 / 45 / 55%, Flash of Light above 25 / 40 / 50% overheal (higher with Divine Purpose). Whole-fight shares that depend on the raid. The app instead flags individual heal GCDs under 20% effective and prices them at the filler. |
| paladin-holy/CooldownGraph/cooldown-bars | no-damage | — | Avenging Wrath or Avenging Crusader, Divine Toll | Avenging Wrath or Divine Toll held | Advice only, no grade: Avenging Wrath (or Avenging Crusader), Divine Toll, Tyr's Deliverance, Aura Mastery and Blessing of Sacrifice "as close to on cooldown as possible". The raid cooldowns (Tyr's Deliverance, Aura Mastery, Sacrifice) are no-damage and assigned to damage events. The two damage-adjacent ones are not tracked. Survey: Avenging Wrath 120.0s shortest / 128.2s median (31 casts), within the 1.25 rule; Divine Toll 30.0s shortest / 33.5s median (100 casts), but the baseline is 60s (45s with Quickened Invocation) so a 30s shortest implies a reduction or reset: check before entering a number. Adding entries is data only. Value of a lost use is the open question: a healer's Avenging Wrath is a healing and Hammer of Wrath window, not a damage window. Low expected value. |
| paladin-holy/Abilities/cast-efficiency-flags | superseded | `checkCooldownDrift` (where tracked) | per row | any flagged ability under its target | The "Can be improved" mark on flagged abilities (Holy Shock 80%, Avenging Wrath and Crusader, Divine Toll and Holy Prism and Tyr's Deliverance at the 80% default, Aura Mastery 60%, Divine Protection 60%, Lay on Hands 10%). Judged per ability in the rows above. Declared cooldowns are hard-coded; Avenging Crusader's faster Crusader Strike and Judgment is not modelled. |
| paladin-holy/CrusadersMight/judgment-cdr-waste | wrong | — | Crusader's Might | casting Crusader Strike or Holy Shock while Judgment is ready | 1.5s off Judgment per Crusader Strike or Holy Shock cast; wasted if Judgment is already ready. Dead count getter (above 0 / 2 / 5). Doubtful: reworked for Midnight on 2026-01-26, and the Holy Shock guide text names this talent as improving Holy Shock, so which cooldown it shortens is not settled by this source. Survey Judgment: 3.85s shortest, 9.6s median over 202 casts, so it is not a plain recast; it would be a `spentCooldownDrift` rule with `reduceOn` for the two casts and a per-use value. Judgment is small damage for a healer. Expected value very low. |
| paladin-holy/ImbuedInfusion/holy-shock-cdr-waste | no-damage | — | Imbued Infusions, Infusion of Light | spending a proc while Holy Shock is ready | 1s per rank off Holy Shock on a proc-spending Flash of Light, Holy Light or Judgment; wasted when it is already ready. Dead count getter. Stale: it still lists Holy Light as a spender after the 2026-07-17 change said it no longer consumes the buff. Would be folded into the Holy Shock model above, not built alone. |
| paladin-holy/Defensives/unused-uses | no-damage | — | Unbreakable Spirit | a defensive never pressed in a long fight | Divine Protection and Divine Shield unused uses shown as Fail, half forgiven. Survival; possible uses come from the whole-fight cooldown model with Stasis as available time. Could inform `lib/mitigation/` only as a prompt, not a damage rule. |
| paladin-holy/statistics | no-damage | — | — | — | Display only: Holy Power spent, per minute and per spell, builder donut, Judgment overview (deliberately not graded on cast efficiency), Infusion of Light procs gained / used / wasted, Flash of Light and Holy Light overviews, Hand of Divinity procs, beacon healing and losses, Light of Dawn targets and distance, Holy Prism targets, Avenging Crusader and Tyr's Deliverance healing, hero-talent and Divine Purpose tiles, mana and healing-per-mana graphs, Flash of Light versus Holy Light ratio, the healing-increase estimators (Rising Sunlight, Reclamation, Protection of Tyr, Gleaming Rays, Unending Light, Divine Revelations). |
| paladin-holy/utility | no-damage | — | — | — | Class utility and defensives (Divine Protection, Divine Shield, Lay on Hands, Blessing of Protection, Sacrifice, Freedom, Cleanse, Hammer of Justice, Blinding Light, Rebuke and others) carry cast-efficiency or timeline displays. Not judged. |

## Not rules

- Models the rules above rest on: the Paladin ability tracker (beacon and
  Infusion-of-Light heal splits), beacon targets, transfer factor and heal
  source, the Light of Dawn and Beacon of Virtue normalizers, the cast-link
  normalizer, event links (Avenging Crusader, hero talents, Holy Shock,
  Infusion of Light, Light of Dawn), the Holy Power tracker (a free-cost
  buff lowers a spender's cost by one) and the spender and generator lists.
  Hand-kept models, not grades.
- The cooldown-reduction table the spec feeds the core model: Crusader's
  Might, Imbued Infusions, Tirion's Devotion (Lay on Hands per Holy Power
  spent), Valiance (Holy Armaments), Laying Down Arms, Sanctified Wrath,
  Unbreakable Spirit and the talent-shortened recasts. Table, not extracted.
  Avenging Crusader's faster strikes and any Divine Toll reset are not
  modelled by WoWAnalyzer; missed sources skew efficiency both ways.
- The shared Paladin Judgment-consumption rule is **not enabled for Holy**
  (Holy's own Judgment is ungraded); the shared Hammer of Wrath declaration
  sets no efficiency target here. Neither flags anything for this spec.
- Cooldown tracker, buff list (recommended uptime left as TODO), healing
  efficiency tracker (flagged as probably useless), crit racial, Lightbearer.

## Phase 3 (2026-10-17)

Samples: 18 Holy Paladin player-pulls measured in full (of 105 on disk),
among them three top Vashnik kills fetched for it (HPS rankings): 三系精通骑 2tCKk8xfM1Wbzj6c fight 1 (100th), Stillw
1Rx3cDy2fF6jpPVk fight 19 (99.9th; Neuropala and Ivanaris in the same
kill), Clarius JQVkMCb8T324yWca fight 27 (99.8th).

- **Talents, from casts:** Crusader Strike is pressed 0 times on 109
  player-pulls, so Crusader's Might (as written) is taken by nobody.
  Every player is Herald of the Sun (Sun's Avatar, Dawnlight). Shield of
  the Righteous is pressed by 8 of 18 (1–48 times).
- **Damage is small and all cooldown-gated:** 1.0–7.2M a pull (3–20k/s),
  from Judgment, Hammer of Wrath, Holy Shock on enemies and Sun's Avatar.
  Top paladins press Judgment less, not more: median interval 9–17s
  against 5–8s for weaker ones.
- **Overhealing (covered):** confirmed firing, but its price was wrong.
  The filler it took (the most-cast damage GCD) was Judgment, a cooldown
  pressed when ready, so heal GCDs bought nothing: it read 0.25–2.27M on
  the top three (Neuropala 2.26M with 1.86M of damage in all), up to 2.0M
  on weaker ones. Fixed in healer.ts: heal GCDs price at 0, except an
  overhealed Holy Power heal within 10s of one of the paladin's own
  Shields of the Righteous, priced at that Shield (20–44k). Now 0–133k a
  pull (Drpippen zdyhBj7pxWG6A8QZ 133k), top three 0–20k.
- **Holy Power waste → `no-damage` (proposed):** the spender a wasted
  point would have bought is a heal for all three top players (0–1
  Shields a pull) and for most others; a damage price only exists for the
  few melee Shield users, at about a third of a 20–44k Shield per point.
  Holy Power isn't rebuilt for Holy (`spenderSnapshotWaste` is Ret's).
- **Holy Shock cast efficiency → `no-damage` (proposed):** a held Holy
  Shock is mostly lost healing. Top players aim it at enemies 0–24 times
  of 69–107 casts (Neuropala and Clarius 0, 三系精通骑 7); its cooldown
  depends on unlogged reductions (survey interval 1.06s shortest).
  Imbued Infusions' reduction (folded into it) → `no-damage` with it.
- **Avenging Wrath and Divine Toll drift → `no-damage` (proposed):**
  Divine Toll deals 0 damage on all 18 (cast on allies). Avenging Wrath
  is pressed every ~2:00–2:20 by every top player, and a use adds
  −31k to +339k of the paladin's own damage (rate inside vs outside its
  30s): top three +43k, −3k, −31k. A healing cooldown with no damage
  value worth tracking.
- **Crusader's Might Judgment reduction → `wrong` (proposed):** nobody
  presses Crusader Strike, and the premise (keep Judgment rolling) fails
  on top players, who let it sit (median 9–17s apart). At most ~40k a
  lost Judgment.
- **Procs:** Infusion of Light and Divine Purpose are healing procs here
  (Divine Purpose's procs.ts entry lists Retribution's spenders; no
  expiry fired on any Holy pull). Gaps on the top three: 0–2k, none after
  an unlisted press.
- For `lib/mitigation/` (not built): Aura Mastery and Blessing of
  Sacrifice are pressed by every sample paladin on raid damage; their
  timing could feed a raid-cooldown view.

## Candidates left (phase 2, kept for the record)

None of these has been measured. In order of expected value, all low:

1. **Avenging Wrath and Divine Toll cooldown drift** (cooldown-bars row):
   cheapest, data entry in `tracked-cooldowns.ts` if the Divine Toll
   interval is explained. Phase 3 would value a lost use from the player's
   own damage in the window and check whether top Holy players hold both
   for healing need (the survey's Avenging Wrath median of 128s against a
   120s shortest hints at holds).
2. **Holy Power waste**: wire `spenderSnapshotWaste` for Holy. Valued as a
   spender GCD at filler damage; phase 3 compares waste between weak and top
   Holy players, and a reactive healer who wastes as much as the top does
   fails it.
3. **Holy Shock availability with the Imbued Infusions reduction**
   (`spentCooldownDrift` with `reduceOn`, a pre-pull cast read from the
   buff): needs a stable talent model at 12.1 first.
4. **Crusader's Might Judgment waste**: very low value, talent target
   unsettled.

The mitigation side (Defensives, Aura Mastery and Sacrifice assignment) is
out of scope for this audit.
