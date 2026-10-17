# WoWAnalyzer audit: Subtlety Rogue

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Rogue shared layer,
  then the spec), spot-checked at their source lines (3 of
  3 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares 12.1.0, fully maintained; last change 2026-08-23
  (Shadow Dance analysis for the Deathstalker and Trickster hero trees).
  No priority list (the helper file for one is never imported) and no
  checklist: every grade is a guide section or a cast-efficiency target.
  The author says the analysis covers the single-target rotation and
  major mistakes only. Many `*Thresholds` getters on the spec's classes
  are defined but nothing reads them; those are rows below marked as
  never graded. Shadow Dance is the centre of the guide: each window gets
  the worst of its sub-grades, and the sub-grades depend on the hero
  tree (three checks for Deathstalker, four for everyone else).
- **App (before phase 3):** `lib/damage/wow/specs/melee.ts` (`"Subtlety
  Rogue"`: the Shadow Blades window through `burstGcdFindings`, and the
  energy cap through `primaryResourceCapFindings`), `tracked-cooldowns.ts`
  (Shadow Blades 90s, Goremaw's Bite 45s), `potion.ts`, generic checks.
  No case study.
- **Core rules** (active time, cast efficiency, potions) are in
  [core.md](core.md); the Rogue shared layer (combo point and energy
  waste, finisher tracker, instant poison) is judged in the rows below.
  Rows cover only what Subtlety sets or adds.
- **Phase 3 (2026-10-17):** done (Claude Opus 5.5). Measured on 41
  Subtlety player-pulls, all Mythic kills: 37 on disk and four top parses
  fetched for this pass (绯弹的亚莉亚 Jk8Rhf6rwqWP1jg7 fight 41, Vashnik
  99.9th; 小胖啵 wPmFHVKRQb31X97z fight 72, 99.8th; Amirmur
  Ax8BRZa16VYwmLN7 fight 44, 99.7th; 志命韓吉 A49h3gvBnRYHZQNX fight 27,
  Entombed Sentinels 100th). Also top: Messerknecht (LckJC7GMhQvD6rdw,
  99.3rd), Charrend (dG8D9y6WxrfmtgXp, 98.8th), Zikli (MLy7nw8kaW1D394Y,
  98.4th), 唐宋不吃糖 (J3ckBVtrZNfWv1h7, 96.6th); best Deathstalker
  Nickledon (baRCnPv62YQ1dJZN, 95.9th). Weak: 棉花糖丨 (MaWQwnygjkh1czL8,
  4.6th), Djamyth (C4Kxpn3FtrvjWMAP, 5.6th), Nami (RwxWC6PF2pJ7Zd9H,
  6.9th), Nýn (zdyhBj7pxWG6A8QZ, 8.2nd), Mystôgân (kZnVcJYpKFRChTzb,
  8.7th), Västolord (z8rQ23NBy4LwM6PZ, 10.7th), Shade, Кагэбист, Rogued,
  Milkiz (17–24th). Talents (casts, buffs, hits): Trickster 25,
  Deathstalker 16; all 16 players probed at Vashnik's 97th percentile and
  up are Trickster. Everyone has 7 combo points, Ancient Arts, Goremaw's
  Bite, Shadow Blades, Secret Technique. **Nobody presses Rupture,
  Symbols of Death or Shuriken Tornado** (0 casts on 41 player-pulls), so
  Assassination's Rupture models have nothing to judge here. Built
  (specs/subtlety.ts, whose header has the models and numbers; 582be15):
  "Big finisher without Ancient Arts" (the Ancient Arts row, widened to
  Secret Technique and Coup de Grace), "Secret Technique just before
  Shadow Dance", the Shadow Dance window, Shadow Dance tracked (two
  charges, a fixed 20.0s recharge), Shadow Blades and Goremaw's Bite given
  their hit ids (both were worth 0 a use), and the Energy cap check
  without the clones' Secret Technique casts (they read 1.08–1.12M on top
  players). Re-run on the top players: the Shadow Blades window (top
  0–39k, weak 0–82k) and Energy cap (top 0–251k, weak 5–712k) kept; the
  three drift checks fire on none of them. The spell survey sweep found
  one press missing, Shuriken Toss (12 casts on 3 player-pulls; game.ts,
  0df5bc9); the clones' casts (282449) aren't GCD presses. GCD uptime
  81% at the median, 81–91% on the three highest-DPS pulls: Energy
  pooling, the known floor. Proposed `wrong`: Secret Technique
  cast efficiency, dance entry Energy, Vanish for Find Weakness. Kept
  `wrong`: cooldown alignment, Shadowstrike outside stealth, generator
  after Vanish.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| rogue-subtlety/ABC/downtime-pct-override | superseded | `checkGcdGaps` | none | idle time | Meant to loosen the downtime thresholds to 25 / 30 / 35%, but the getter is named differently from the one the core reads, so the core 5 / 10 / 15% applies and the override is dead. Whole fight, Stasis included. The guide doesn't show it either way. |
| rogue-subtlety/ShadowDanceGuide/window-grade | superseded | — | hero tree (Deathstalker or Trickster); Deeper Stratagem | any window with a failing sub-check | The worst of the sub-grades below, per Shadow Dance window; a player in neither tree is judged with the Trickster checks. Each sub-check is judged on its own row. |
| rogue-subtlety/ShadowDanceGuide/gcds-filled | superseded | the active-time row below | Deepening Shadows | a window with idle GCDs | Expects one counted cast per second of window, rounded up (all = perfect, one short = good, two short = fail). The window premium is the active-time row below; this version's counting is broken: it counts only six finishers and shuriken casts, so Backstab, Gloomblade and Shuriken Toss in a window read as missing, and a 7.1s window demands 8. |
| rogue-subtlety/ShadowDance/active-time-in-window | verified | "Shadow Dance window" (specs/subtlety.ts) | none | idle GCDs in a Shadow Dance | Meant to grade average active time inside dance windows (below 95 / 90 / 80%), but the getter is never read and the guide shows the average in a fixed good colour. Phase 3 (2026-10-17): built as `burstGcdFindings` on the dance's buff (185422), each GCD short priced at the window's hit bonus (only the premium: the gap check prices the GCD). Top players 0–39k a pull (绯弹的亚莉亚 Jk8Rhf6rwqWP1jg7 39k), weak 0–222k (Mystôgân kZnVcJYpKFRChTzb: 5:52 and 6:38, two short each). Small. |
| rogue-subtlety/CastsInStealth/casts-per-window | superseded | the active-time row above | Subterfuge | stealth or dance windows with fewer casts than a fixed maximum | Intended 1 builder per stealth window and 8 per dance (3 and 9 with Subterfuge), with Shadowstrike used instead of Backstab. The getters are never read, so it grades nothing. As written it is the fill-the-window idle again, and the "wrong builder" half tests something the game decides (Shadowstrike replaces Backstab in stealth). |
| rogue-subtlety/ShadowDanceGuide/secret-technique-timing | verified | "Secret Technique just before Shadow Dance", "Big finisher without Ancient Arts" (specs/subtlety.ts) | Deathstalker hero tree; Shadow Blades | Secret Technique cast late in a dance, skipped, or a dance entered without it | Deathstalker only in WoWAnalyzer. Phase 3 (2026-10-17), measured for both trees: a Secret Technique in a dance did 342–778k, one outside 23–652k. Built: one pressed outside a dance less than 8s before the next, priced as the dance's average − the outside average − the wait's share of a cast. Top none (their outside ones come 13–26s before the next dance) but Zikli (MLy7nw8kaW1D394Y) 142k; weak Mystôgân 646k (0:05, 0:21, 0:52: 0.4–1.3s before the dance), Djamyth (C4Kxpn3FtrvjWMAP) 643k, Vespionr (vRPGT4MN6VALQWFh) 364k. Not built: "dance entered without it" (dances without a Secret Technique: top 0–5 a pull, weak 1–10, overlapping) and its order in the dance. The press without Ancient Arts is the next row's check. |
| rogue-subtlety/ShadowDanceGuide/ancient-arts-pairing | verified | "Big finisher without Ancient Arts" (specs/subtlety.ts) | Deathstalker (Darkest Night); Ancient Arts | an Eviscerate under Darkest Night without the Ancient Arts buff | Phase 3 (2026-10-17): every one of 41 player-pulls has Ancient Arts (1269163): a builder that fills the combo points grants it, the next finisher spends it and echoes for ~0.5–0.9× its own hits (1269205 / 1269560 / 1269565). Every Darkest Night (457280) was spent by an Eviscerate, whose echo is 169–292k against 54–163k for an ordinary finisher. Secret Technique (echo 0.21–1.0M) and Coup de Grace (161–343k) gain the same way, so the check covers all three for both trees. Lost per press without the buff: its own hits × the player's echo ratio − their ordinary echo − what getting the buff first costs (main session's timeline question): a builder at the cap (its points wasted), the finisher a GCD later (that GCD's share of every later one), and a Secret Technique pushed out of its dance the in-dance − outside average; 100–170k a press, and a press that doesn't beat it is a trade, not counted. Netted (before): top 绯弹的亚莉亚, Charrend, Amirmur none, Messerknecht 31k (464k), 唐宋不吃糖 90k (282k), 志命韓吉 355k (529k), 小胖啵 (wPmFHVKRQb31X97z) 621k (2.10M), 水知我 873k (1.05M), Zikli 2.58M (4.57M: Secret Techniques pressed the instant he dances at points Shadow Techniques filled, 0:31, 1:16, 2:19; one builder first still lands them in the ~8s dance, so not a trade); best Deathstalker Nickledon 0.45M / 1.16M. Weak: Rogued (1NL29tyvbzGhZgPK) 4.37M (6.36M), Feyxd (6kHtGaQXCMWYxFpZ) 2.99M (6.20M; Darkest Night Eviscerates from 0:12), Shade 2.07M, Mystôgân 1.72M, 棉花糖丨 1.20M, Västolord 1.10M, Nami 1.10M, Nýn 595k, Djamyth 265k. Zikli is the one top player who reads high, a real loss. |
| rogue-subtlety/ShadowDanceGuide/cooldown-alignment | wrong | — | Shadow Blades; non-Deathstalker hero tree | a Trickster dance with Secret Technique down and Shadow Blades down | Strict either/or: a dance cast to avoid capping its charges (Double Dance) grades as a fail. The spec's own cast-efficiency text tells the player to dance before the charges cap, so the two contradict. Phase 3 (2026-10-17), re-checked: dances with no Secret Technique in them are 0–5 a pull on the top players (绯弹的亚莉亚 5 of 20, Amirmur 4 of 19) and 1–10 on the weak (Shade 1 of 17, Nýn 2 of 19, Mystôgân 10 of 17): it fires on the top players as on the weak, and Secret Technique fits no cooldown model to say it was ready. Kept `wrong`. |
| rogue-subtlety/ShadowDanceGuide/entry-energy | wrong | — | Shadow Focus | a dance entered below 30 or 35 energy | Only graded when Secret Technique is usable or Shadow Blades is up. Costs are hard-coded base costs, so a Shadow Focus player is held to the full cost. Phase 3 (2026-10-17): Energy on the Shadow Dance cast (185313). Dances entered below 50 Energy: top 0–5 of 16–21 (Amirmur Ax8BRZa16VYwmLN7 5, 小胖啵 4, Messerknecht 3; median entry 62–100), weak 0–7 (Djamyth 7 of 19). Fires on the top players as much. Proposed `wrong`. |
| rogue-subtlety/ShadowDanceGuide/entry-combo-points | candidate | — | Deeper Stratagem | a dance entered below the combo point cap | Strict: 4 of 5 fails. Phase 3 (2026-10-17): combo points are logged on finishers only, so the count at the dance isn't in the log; the finishers below 7 points (next rows) are the visible part: top 0–7 a pull, weak up to 17, worth ~0–0.4M. Unbuilt, negligible. |
| rogue-subtlety/ShadowBlades/dance-alignment | candidate | — | Shadow Blades; Double Dance | Shadow Blades cast with Shadow Dance down and unavailable | Phase 3 (2026-10-17), with Shadow Dance's measured 20s / two-charge recharge: no charge at hand 3s before Shadow Blades on the top players only once (小胖啵 6:05, the last window); weak Dac (ZvrLTQfk1zbAXMwB) 3–4 windows, Djamyth 3, Feyxd 3, Кагэбист 2, Nýn 2. The dance isn't lost, only spent outside Shadow Blades: the window's extra hits (279043) are ~13% of its damage, ~0.1M on a dance's extra. Unbuilt, small. |
| rogue-subtlety/ShadowBlades/secret-technique-available | unverifiable | — | Shadow Blades | Shadow Blades cast with Secret Technique on cooldown | Phase 3 (2026-10-17): Secret Technique's cooldown fits no fixed recharge (the largest every cast fits is 12–21s by player; any fixed value has every player, the top included, "holding" it 64–160s), so when it was ready can't be read from the log. 149 of 163 Shadow Blades windows hold a Secret Technique. |
| rogue-subtlety/ShadowBlades/two-dances | candidate | `burstGcdFindings` (Shadow Blades) | Shadow Blades; Double Dance | a Shadow Blades window with one or three dances | Phase 3 (2026-10-17): the top players put two dances in every window (the opener's dance just before Shadow Blades counted), but 小胖啵's last; weak Caedseax (fcj1YgaCJBT2kXFm) one in all four with a charge at hand, Dac, Djamyth, Mystôgân one in 3–4. Same value as the row above: the dance moves, ~0.1M a window. Unbuilt, small. |
| rogue-subtlety/Shadowstrike/stealth-only | wrong | — | Subterfuge | Shadowstrike without a stealth-type buff | Checks the cast against four buffs. Phase 3 (2026-10-17), re-checked: 1,597 Shadowstrikes on 41 player-pulls, every one under Stealth, Vanish or Shadow Dance but 28 opener presses at 0:00–0:01 whose Stealth began before the log. The game enforces it; the rule can only fire on a gap in its own buff list. Kept `wrong`. |
| rogue-subtlety/guide/EnergyCapWaste/time-at-cap | covered | Energy cap (specs/subtlety.ts `energyCapped`) | Vigor | Energy generated into a full bar | Perfect to 5%, good to 10%, ok to 15%, fail above, over the whole fight with Stasis counted as capped. The app sees only non-spending casts made at the cap. Phase 3 (2026-10-17): the clones' Secret Technique casts (282449, two a press, no cost) read as casts at full Energy and made 21–30 of them on the top players (绯弹的亚莉亚 1.08M, 小胖啵 1.12M, Zikli 1.08M); excluded now: top 0–251k, weak 5–712k (Nýn 712k). |
| rogue-shared/EnergyDetails/wasted-generator-energy | covered | Energy cap (specs/subtlety.ts) | none | energy gains at a full bar | Event-based gains only. The app's cap check sees the same casts. |
| rogue-shared/EnergyCapTracker/regen-lost-at-cap | unverifiable | — | Vigor | passive regen lost at the cap | Predicted, not logged (core.md). The part the log shows is the row above. |
| rogue-subtlety/Energy/wasted-ratio | superseded | Energy cap (specs/subtlety.ts) | Vigor | — | Meant to grade energy waste over generated at 3.3 / 6.6 / 10%, but the getter is never read. The same waste as the two rows above. |
| rogue-subtlety/guide/CooldownGraph/shadow-blades | covered | `checkCooldownDrift` (Shadow Blades, 90s) | Shadow Blades | Shadow Blades held | Default 80% target on the cooldown bar. WoWAnalyzer counts forced time as ready; the app counts whole lost uses less forced time. Phase 3 (2026-10-17): a use was worth 0 (no hits under its cast id), so its drift never showed; now its hits (279043), 0.82–1.97M a use (a floor). Top none; Caedseax 1.36M, Rogued 1.21M (21.9s held), Dac 1.15M. |
| rogue-subtlety/guide/CooldownGraph/goremaws-bite | covered | `checkCooldownDrift` (Goremaw's Bite, 45s) | Goremaw's Bite | Goremaw's Bite held | 90% target, only when talented. Phase 3 (2026-10-17): worth 0 a use before (hits under 426592 / 426593, and the echoes of its 14s window under 1309309 / 1269217, every one within 14.0s of a press); now 0.52–1.39M a use less a GCD. Top none; Кагэбист (7L3RKpavDA8T4MjY) 3.37M (6 uses with room for 9, 141.7s held), 利维坦夜刃 1.08M, Caedseax 900k, Västolord 876k, Rogued 744k. |
| rogue-subtlety/guide/CooldownGraph/secret-technique | wrong | — | Secret Technique (haste-scaled 25s base) | Secret Technique held | 80% target on the bar. Phase 3 (2026-10-17): no fixed recharge fits (largest every cast fits 12–21s by player; at 18s every player, top included, would "hold" it 64–160s a pull), and the presses follow the dances (in a dance on 13–18 of 14–20 a pull for the top players). It is held for the dance by design; the loss is the next-row check "Secret Technique just before Shadow Dance". Proposed `wrong`. |
| rogue-subtlety/guide/CooldownGraph/vanish | candidate | — | none | Vanish held | 80% target on the bar, 120s. Phase 3 (2026-10-17): top players use it 0–4 times a pull (唐宋不吃糖 J3ckBVtrZNfWv1h7, 96.6th, none; Charrend 1), weak 0–3. No per-use value measured (its stealth gives one Shadowstrike and Premeditation). Unbuilt, low. |
| rogue-subtlety/Abilities/shadow-dance-efficiency | verified | `checkCooldownDrift` (Shadow Dance, two charges, 20s; tracked-cooldowns.ts) | Double Dance (2 charges); Deepening Shadows | Shadow Dance charges held or capped | Phase 3 (2026-10-17): the largest fixed recharge every player's casts fit is 20.00s on 37 of 41 player-pulls (19.75–22 on the rest), with two charges: no combo-point reduction shows. Tracked; a lost dance is valued by its window's hit bonus × the damage in an average dance (feral.ts feralWindowValue, +1–30%: 32k–1.32M; the ×1.5–5.4 damage rate in a dance is mostly pooled resources, not its value). Charges capped (20s model): top 5–16s a pull, no lost use; weak Nami 1.86M (54.4s, 3 uses), Mystôgân 1.52M, Västolord 825k, Milkiz 607k, Shade 445k. |
| rogue-subtlety/Abilities/shuriken-tornado-efficiency | candidate | — | Shuriken Tornado | Shuriken Tornado held | Phase 3 (2026-10-17): no one of the 41 player-pulls takes it (0 casts). Nothing to measure. |
| rogue-subtlety/FinisherUse/low-cp-finishers | candidate | — | Deeper Stratagem | an Eviscerate cast below 4 combo points | Phase 3 (2026-10-17): finishers below 7 points (Eviscerate, Black Powder, Secret Technique, Coup de Grace): top 0–7 a pull (小胖啵 7), weak up to 17 (Rogued 17, Djamyth, Shade, Caedseax, Testiculatin 15), almost all at 5–6 points. Priced as the press's Energy spread over fewer points (Feral's Bite model): top 0–111k, weak up to ~383k. Unbuilt, negligible. |
| rogue-shared/FinisherTracker/inefficient-finishers | superseded | — | stratagem talents | finishers under the recommended points | The shared version of the row above. Subtlety replaces it with its own, and the shared getter isn't graded here. |
| rogue-shared/ComboPointDetails/wasted-cp | candidate | — | stratagem talents | generators landing at max combo points | Phase 3 (2026-10-17): not measured. Combo points are logged on finishers only, and a builder pressed at the cap is how Ancient Arts gets onto a big finisher (the "Big finisher without Ancient Arts" check), so some waste is the right play; Assassination's rebuild of the same waste fired on its top players as much. |
| rogue-subtlety/ComboPoints/wasted-ratio | superseded | — | stratagem talents | — | Meant to grade combo point waste over generated at 5 / 10 / 15%; the getter is never read and it overlaps the shared rule. |
| rogue-subtlety/BuilderUse/wasted-builders | candidate | — | none | a builder that gained no points at max | Chart only. Phase 3 (2026-10-17): not measured, as the wasted-cp row (a builder at the cap can be what grants Ancient Arts). |
| rogue-subtlety/GeneratorFollowingVanish/non-generator-after-vanish | wrong | — | none | the first cast after Vanish isn't a generator | A statistic table only (the getter is never read). Gloomblade is missing from the generator list, so a Gloomblade player is flagged for a correct cast, and an off-GCD cast in between (trinket, potion) counts as a miss. Phase 3 (2026-10-17): one Gloomblade pull of 41 (Nickledon, baRCnPv62YQ1dJZN Entombed Sentinels), and Vanish is used 0–4 times a pull; nothing changes the premise. Kept `wrong`. |
| rogue-subtlety/VanishFindWeakness/early-vanish | wrong | — | Find Weakness | Vanish used to reapply Find Weakness with over 1s left | Phase 3 (2026-10-17): Find Weakness is now the player's own buff (1264521, on all 41 player-pulls), applied by Shadowstrike and refreshed by the builders, not an 18s enemy debuff: there is nothing to reapply with Vanish. Proposed `wrong`. |
| rogue-shared/InstantPoison/proc-rate | no-damage | — | none | — | Poison hits over melee hits. A luck measure. |
| rogue-subtlety/statistics | no-damage | — | — | — | Display only: Shadow Dance and Shadow Blades uptime, Black Powder damage, the Dark Shadow contribution estimate, per-window dance damage, duration and cast strips, total dance damage and share, Shadow Blades per-use list, the (always good) Backstab and Eviscerate cast lists, builder and spender donuts, combo point and energy graphs, Deeper Daggers uptime, Echoing Reprimand gains, the Arcane Torrent helper. |
| rogue-shared/utility | no-damage | — | — | — | Crimson Vial, Evasion, Feint, Cloak of Shadows, Shroud of Concealment, Blind, Kidney Shot, Sprint, Shadow Step, Kick, Tricks of the Trade, Distract, Thistle Tea. Cooldowns declared for tracking only. Utility and defensives aren't judged. |

Not rules (models the rules above rest on): the combo point and energy
trackers (cap 5 plus the stratagem ranks, energy cap and regen scaled by
Vigor, Shadow Focus cost reduction), the Shuriken Storm waste normalizer,
the event links (each Shadow Dance to its removal and the damage inside
it; each Shadow Blades to its removal and the dances in it, 21s search),
the dance damage tracker, the stealth helpers and stealth damage tracker,
the per-window dance data model (energy and combo points at entry, Secret
Technique cooldown remaining, dance index within Shadow Blades), the
Deepening Shadows cooldown reduction, Rupture and pandemic helpers that
no module calls, and hero tree detection. Dead code: a misspelled
duplicate of the Eviscerate module, an unused Dark Shadow base class, and
the unimported priority-list helpers.

## Candidates left

After phase 3 (2026-10-17), all unbuilt and small or unmeasurable:
1. **Shadow Blades setup** (dance alignment, two dances): weak players
   put one dance in 3–4 windows, top players two; the dance moves rather
   than being lost, ~0.1M a window.
2. **Finishers below the cap** (low-point finishers, dance entry combo
   points): top ~0–0.1M, weak up to ~0.4M a pull.
3. **Vanish held**: top players use it 0–4 times; no per-use value.
4. **Combo point waste and wasted builders**: not in the log (points on
   finishers only), and a builder at the cap is often the right play.
5. **Shuriken Tornado**: nobody takes it.
