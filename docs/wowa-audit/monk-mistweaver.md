# WoWAnalyzer audit: Mistweaver Monk

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Monk shared layer,
  then the spec), spot-checked at their source lines (3 of 3 matched;
  the first extract's line citations were off and it was redone), and
  the ledger drafted by a Sonnet subagent, then reviewed in the main
  session. Reference only (AGPL): our own words, no ids or tables taken.
- **Spec:** declares 12.1, fully maintained; last change 2026-09-27
  (Conduit and Master of Harmony statistics). Current. About 116 modules,
  nearly all display. Unlike Elemental it has a **priority list**: three
  lists chosen by build (Rising Mist with Jadefire Teachings, Rising Mist
  with Rushing Wind Kick, and a short fallback for every other build), plus
  guide sections for core spells, healing cooldowns, other cooldowns,
  defensives and preparation. Almost every graded item is healing, mana or
  a buff-waste count. The damage-touching ones are the kick priority and
  its cast efficiency, Spinning Crane Kick under a Dance of Chi-Ji proc,
  Tiger Palm and Blackout Kick filler, Teachings of the Monastery stacks,
  Touch of Death and Celestial Conduit.
- **App:** `lib/damage/wow/specs/healer.ts` (`"Mistweaver Monk"` runs
  `HEALER_CHECKS`, one check, `healGcds`: a heal GCD whose spell was under
  20% effective, valued at the healer's own damage filler, marked
  inference), the generic checks (`checkGcdGaps`, `checkDeaths`,
  `checkInterrupts`, `checkProcs`). Mistweaver has no entry in
  `tracked-cooldowns.ts` (Windwalker has Invoke Xuen and Celestial Conduit)
  and no burst or resource check; healers are skipped by the potion check.
  Case study: none. healer.ts was built from a survey of only 2 Mistweaver
  sample players and records the spec as unverified; the survey's observed
  GCD of 740ms is suspect (healer.ts header, open-items 2026-10-15). So
  nothing below is `verified`. (Phase 3 settled the GCD and added
  Celestial Conduit to `tracked-cooldowns.ts`; see the Phase 3 bullet.)
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Mistweaver sets or
  adds. The class layer (Celestial Conduit, Touch of Death, Heart of the
  Jade Serpent) is folded in here because Mistweaver reuses it.
- **Phase 3:** done 2026-10-17 (Claude Opus 5.5), a short healer pass.
  Logs, all Mythic: the samples' seven Mistweavers (Abuki's 16 static
  pulls on gVDPhzp61Zm29HMw, Icyricy wWx8B1GPZMLghAyz, Karambicaak
  6kHtGaQXCMWYxFpZ, 嗚吶 7B1wQbjNhgXJDaHC, 담백한버터 aZ6NnwL8g9PdpGJ1,
  Zolairoshi r9CX1kpRGLmKJH4M, Chiyune ZjVtM1vFcrp7w3WC); fetched for
  Vashnik: the top healing parses 汼頭人 (K4x8cMZYVpGCDbJH f4, 100th hps)
  and Feraimm (8kVQMJ4rmpnyRjBH f24, 99.8th), the top damage parses
  孫靑雲 (J3ckBVtrZNfWv1h7 f26, 100th dps), 玛格特丶萝比
  (MaWQwnygjkh1czL8 f28) and Шидэ (7L3RKpavDA8T4MjY f40), and two weaker
  damage builds, Mamihradose (zdyhBj7pxWG6A8QZ f30, 95th) and Monkfupera
  (Ftj4vwHf9RazPcqV f36, 94th). Builds, from casts and buffs: every
  sample player and both top healers run Rushing Wind Kick with Invoke
  Yu'lon (six of the seven on Conduit of the Celestials, Karambicaak on
  Master of Harmony); the damage builds run Invoke Chi-Ji with Teachings
  of the Monastery and Jadefire Stomp, kicking with Rising Sun Kick
  (MaWQ, Шидэ, Mamihradose) or Rushing Wind Kick (孫靑雲, Monkfupera).
  Built: Celestial Conduit drift (`tracked-cooldowns.ts`). Engine fixes
  (healer.ts header): the survey missed Sheilun's Gift, Detox, Revival
  and the Mana Tea, Soothing Mist and Crackling Jade Lightning channels
  (game.ts), and the observed 740ms GCD is Rushing Wind Kick's and
  Soothing Mist's own short GCD, which dragged the haste fit (haste.ts);
  GCD uptime 48–82% → 65–89%. Mana Tea channels up to 7.1s, past the
  status-lock cap (timeline.ts, now 10s). `healGcds` no longer takes
  Touch of Death as the filler (Abuki, Coiled Altar Pull 1: 12.4M →
  0.38M).

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| monk-mistweaver/AlwaysBeCasting/downtime-grade | superseded | `checkGcdGaps` | none | idle above 40% of the fight | Colour grade by idle share (perfect at none, good to 40%, ok to 55%); very lenient. Whole-fight denominator, forced time counted as idle, and a whole Soothing Mist channel counts as active even if it cast nothing. The app values each gap less forced time. Its observed GCD for this spec is suspect, so check the gap findings on a log with more Mistweavers first. Phase 3 (2026-10-17): `checkGcdGaps` fires on every Mistweaver pull. The GCD is the ordinary 1.5s hasted one (0.84–0.97s after a Renewing Mist or Vivify); the 740ms is Rushing Wind Kick's and Soothing Mist's own short GCD. Fixed in the engine with the missing presses and channels (healer.ts header): GCD uptime 48–82% → 65–89%, Abuki's 16 pulls +0–9 points. |
| monk-mistweaver/Apl/common/rsk, rm-jft/after-tft, rm-rwk/rwk-first | unverifiable | none | Rising Mist; Rushing Wind Kick or Jadefire Teachings | Rising Sun Kick or Rushing Wind Kick held while lower spells are cast | The kick sits near the top of every list. Core ledger: priority checking is superseded by the spec checks, and its pre-pull casts are ignored. The kick is the one list spell with real damage, so it is worth a look as a recast check, but the logged recast spreads (Rushing Wind Kick shortest 0.75s, median 4.2s in the survey) because Thunder Focus Tea cuts it, Morning Breeze resets it and Pool of Mists shaves it. That fits `spentCooldownDrift` (a fixed reduction per buff event, `reduceOn`, plus a per-use value) for the Thunder Focus Tea and Pool of Mists cuts; the Morning Breeze reset and the haste scaling are modeled in WoWAnalyzer's code, not the log. Phase 3: value a use from the player's own kick damage and what top Mistweavers do, since a healer often keeps the kick for a heal GCD. Expect most of it to fail the premise check. Phase 3 (2026-10-17), **not built: the cooldown can't be rebuilt from the log** (`_scratch/mw-rwk.js`). The kick is the spec's main damage (Rushing Wind Kick 468179 is 58–72% of a healing build's damage, 47–70k a press; Rising Sun Kick 185099 43–54% of a damage build's). Kick-to-kick intervals with no Thunder Focus Tea and no gain of the reset proc (1296687, "Rising Sun Kick", never runs out: 0 of 330 removals without a kick) between them still go as low as 0.7–2.2s on every player, top included, so resets or charges come from something the log doesn't show; no floor to rebuild from. Rates don't separate either: healing builds 10.4–14.6 kicks a minute on the samples (嗚吶 10.4, Icyricy 14.6, Abuki 11.9–13.9), 汼頭人 12.5 and Feraimm 14.8 on top; damage builds 19.2–21.3 on top, Mamihradose 14.9 and Monkfupera 17.7. |
| monk-mistweaver/CastEfficiency/rising-sun-kick, rushing-wind-kick | unverifiable | none | Rising Sun Kick (suggested only with Jadefire Teachings); Rushing Wind Kick | kick used under 80% of its possible casts | Whole-fight cast efficiency, 12s divided by haste, forced time counted as ready, the shown cooldown declared literally. Not in `tracked-cooldowns.ts` (the comments there leave out cooldowns whose recharge spreads too far): this is the same row as the kick priority, to be built through `spentCooldownDrift` if at all. Phase 3 (2026-10-17): unverifiable for the same reason as the row above (resets the log doesn't show; no interval floor). |
| monk-mistweaver/CastEfficiency/healing-cooldowns | no-damage | — | Renewing Mist; Mana Tea; Thunder Focus Tea; Invoke Yu'lon or Chi-Ji (Gift of the Celestials halves it); Life Cocoon (Chrysalis); Revival or Restoral (Uplifted Spirits) | a healing cooldown held past ready | Targets 80%, nothing overridden; Mana Tea has no cooldown declared so no efficiency is ever computed. All are heals or mana. The app does not judge when to heal. Survey intervals for Yu'lon (120.6 / 124.8s) are tight enough to track, and Thunder Focus Tea (12.2 / 21.9s) is not, but neither is a damage question. Forced time counted as ready. |
| monk-mistweaver/CelestialConduit/cast-efficiency | verified | `checkCooldownDrift` ("Celestial Conduit drift", `tracked-cooldowns.ts`) | Celestial Conduit (hero tree); Unity Within | Celestial Conduit held past its 90s cooldown | Windwalker already tracks it (90s, first use about 13s in). Mistweaver's survey interval is 91.4s shortest, 95.1s median over 10 casts of 2 players, which passes the 1.25x spread rule, so a `tracked-cooldowns.ts` entry is trivial. The unverified part is whether Unity Within or Heart of the Jade Serpent shortens the Conduit itself for this spec (the class layer applies the haste-window recovery to a fixed list of cooldowns, shown in the Unity row below). Value: the cast is mostly heal and a damage burst scaling to five targets; a lost use is valued from the log's own Conduit damage, low for a healer. Low value, very cheap. Phase 3 (2026-10-17), **built**: 90s (shortest interval 90.0s, 89 casts of 12 players; nothing shortens it below that), first use 13s (median of 25 player-pulls), valued by its hits 443038 (not the cast id) less a GCD: 52–541k a cast. Fires on none of the five top players (all every 90–105s) and none of Abuki's 16 pulls; on 嗚吶 160k (7B1wQbjNhgXJDaHC, 3:34 after 2:18 lost, 166s gap), Icyricy 222k (wWx8B1GPZMLghAyz, from 3:34; a fifth would have landed before the 6:38 kill), Mamihradose 220k (zdyhBj7pxWG6A8QZ, 0:53 first, then 160s and 147s), Monkfupera 175k (Ftj4vwHf9RazPcqV, 157s from 4:27). Not inference: a healer may hold it for a damage event, which the finding can't tell. |
| monk-mistweaver/CelestialConduit/full-channel | covered | `checkGcdGaps` | Conduit of the Celestials | Conduit channel cut short by movement, a stun or a cancel | A cancelled channel leaves idle time the gap check counts; the app cannot tell a boss-forced cut from the player's, and neither can WoWAnalyzer. |
| monk-mistweaver/CelestialConduit/unity-cdr-on-cooldown | unverifiable | — | Unity Within | Unity Within cast while Renewing Mist, the kick, Thunder Focus Tea or Life Cocoon were ready | Reads a modeled cooldown: the reductions and the Heart of the Jade Serpent rate are not in the log. Counts forced time as ready. Four cooldown marks outweigh the channel and targets marks in the average. |
| monk-mistweaver/CelestialConduit/targets-hit | no-damage | — | Conduit of the Celestials | fewer than 5 targets a pulse | Counts heal pulses only, so a single-target boss fails it. The damage bonus caps at five targets; a target-count loss on a single boss is not the player's choice. |
| monk-mistweaver/CelestialConduit/cast-rating | superseded | — | Conduit of the Celestials | — | The average of the three rows above, so nothing of its own. |
| monk-mistweaver/TouchOfDeath/cast-efficiency | candidate | — | Fatal Touch (180s to 90s) | Touch of Death cast below its maximum | 85% of an execute-window maximum, in the class layer; whole-fight denominator for the base uses, forced time counted as ready, no pre-pull credit. The two surveyed Mistweavers cast no Touch of Death at all, so the app has no interval to track. Expected value near zero until a log with a Mistweaver using it exists. Phase 3 (2026-10-17), **measured, not built**: a press is worth 287–450k (its hits, one GCD). Usable in the boss's execute or on low adds, so presses cluster at the kill (Feraimm 5:31 of 6:03, Шидэ 6:26 of 6:44, 嗚吶 5:40 of 5:57, Zolairoshi 6:55 of 7:04; 玛格特丶萝比 2:16 and 4:09). Three of the five top players press it, two (汼頭人, 孫靑雲) don't; of the others 2 of 6 sample players, Abuki 1 in 7 kills (Coiled Altar), Mamihradose and Monkfupera none. A check needs the boss's execute window (target health) and fires on 2 of 5 top players; left unbuilt while WoW healers are to be judged on healing (open-items, 2026-10-15). |
| monk-mistweaver/DanceOfChiJi/buff-waste | candidate | none (Mistweaver's proc isn't in `procs.ts`) | Dance of Chi-Ji | procs refreshed or left to expire unspent | The proc adds 400% to Spinning Crane Kick, so a lost proc is the one real Mistweaver damage loss. Only an expiry is visible; a refresh before use is not. Whether `checkProcs` sees it as a proc is unconfirmed: it is not in the surveyed status list for this spec, so it is a phase 3 question. Raw count, no whole-fight denominator; a proc can expire in forced time. Phase 3 (2026-10-17), **not covered, not built**: Mistweaver's Dance of Chi-Ji is buff 438443 (J3ckBVtrZNfWv1h7's log), not Windwalker's 325202 that `procs.ts` lists, so `checkProcs` never sees it. Of the 14 Mistweavers only 孫靑雲 (100th dps, the Chi-Ji build that kicks with Rushing Wind Kick and spins) has it: 25 gained, all 25 spent by Spinning Crane Kick, spans up to 8.3s, 2 re-procs while held. With no expiry on any log its duration can't be measured (`procs.ts` rule), and the one player who takes it loses none. |
| monk-mistweaver/ChiJi/totm-stacks-on-cast | candidate | — | Teachings of the Monastery; no Celestial Harmony | Invoke Chi-Ji cast with fewer than 3 Teachings stacks | Banked stacks make Blackout Kick hit harder inside the Chi-Ji window. Per cast, fixed 3 and 2, builds without Celestial Harmony only. Value would be the Blackout Kick hits it adds against the window's casts; the log shows the stack buff. Phase 3: needs the stack counts at the cast and whether top Mistweavers who take Chi-Ji enter with stacks. Low value. Phase 3 (2026-10-17), **measured, not built** (`_scratch/mw-totm.js`; Teachings 202090 stacks to 4). Chi-Ji casts after the opener entered with 3+ stacks: 孫靑雲 5 of 6 (4:13 with 1), 玛格特丶萝比 3 of 3, Шидэ 2 of 3 (5:49 with 1); weaker Mamihradose 2 of 2, Monkfupera 0 of 2 (3:35, 5:56). Fires on two of three top players. The stacks' worth didn't show: a Blackout Kick's hits within 0.4s were 25–43k with 1–4 stacks and 10–16k with none, with no rise from 1 to 4, so a missing stack is at most ~15k. Negligible. |
| monk-mistweaver/ChiJi/totm-overcap | candidate | — | Teachings of the Monastery; Invoke Chi-Ji | a Teachings stack refreshed at the cap during Chi-Ji | Any wasted stack in the window fails the cast; the source meant the first Blackout Kick to overcap on purpose but never exempts it. A stack gained at the cap is a lost Blackout Kick hit, valued by the average hit; the cap itself is visible in the log. Very low value and the exemption is wrong in WoWAnalyzer. Phase 3 (2026-10-17), **measured, not built**: "refreshed" events on Teachings (gains at the cap) inside a 12s Chi-Ji window: top 孫靑雲 16, 玛格特丶萝比 4, Шидэ 3; weaker Mamihradose 10, Monkfupera 2. Every player does it, top most of all, and a stack is worth ~15k at most (row above). |
| monk-mistweaver/Celestial/rsk-cast | no-damage | — | Rising Mist; Invoke Yu'lon | no kick during the summon | A yes or no per summon. The kick under Rising Mist extends HoTs, so the value is healing; whether a kick in the window is worth the GCD is the healer's call. Window shortened by phases is not considered. |
| monk-mistweaver/Celestial/enveloping-count, secret-infusion, heart-of-the-jade-serpent, spiritfont-active, cast-average | no-damage | — | Jade Bond; Secret Infusion; Flowing Wisdom; Spiritfont | a celestial summon missing Enveloping Mists, a haste buff or Spiritfont | All healing and haste alignment. The Enveloping Mist count uses hard-coded 4 and 2.5 per summon and the Fail branch is unreachable. The celestial average mixes a varying number of parts. Not judged. |
| monk-mistweaver/ThunderFocusTea/empower-priority, yulon-focused-thunder | no-damage | — | Thunder Focus Tea; Focused Thunder; Invoke Chi-Ji or Yu'lon | Thunder Focus Tea spent on the "wrong" spell | The ranking flips by which celestial is talented (kick best for Chi-Ji, Renewing Mist best for Yu'lon) and contradicts the Jadefire after-Thunder-Focus-Tea priority rule, which allows either. An opinion, not a damage rule, and the kick cut it applies is the model the kick candidate above would need. Phase 3 (2026-10-17): it does hide a damage effect, an extra kick (47–70k) when Thunder Focus Tea goes on it; the samples spend 3–22 of theirs on the kick a pull. Which spell it goes on is the healer's call, so it stays `no-damage`. |
| monk-mistweaver/Apl/healing-rules (Renewing Mist capped, Vivify at 8 targets, Zen Pulse, Spiritfont, Black Ox, Mana Tea) | no-damage | — | Rising Mist; Pool of Mists; Invigorating Mists; Zen Pulse; Spiritfont; Strength of the Black Ox; Mana Tea | a heal or mana spell held at its cap | The healing half of the priority lists (about 15 conditions, several optional "permit only"). Nothing here prices damage. A cast skipped for movement or a boss phase reads as a violation, a target-count condition can only permit a cast, and pre-pull casts are ignored. |
| monk-mistweaver/Apl/filler (Blackout Kick, Tiger Palm) | superseded | `checkGcdGaps`, `healGcds` | Teachings of the Monastery | — | Optional rules, so they only permit the cast and never fire. The app prices an empty GCD by the gap check and a heal GCD by `healGcds` against the filler already; no per-cast order is judged. Phase 3 (2026-10-17): both fire on Mistweaver pulls. `healGcds` prices at Tiger Palm or Blackout Kick (5–13k) when pressed, else nothing (14 of Abuki's 16 pulls): the kick's hits log under another id, so it's never the filler, which is about right (healer.ts header). |
| monk-mistweaver/Vivify, ZenPulse, Spiritfont, StrengthOfTheBlackOx, AspectOfHarmony | no-damage | — | Invigorating Mists; Zen Pulse; Spiritfont; Strength of the Black Ox; Aspect of Harmony | a heal with few Renewing Mists, an unspent proc or a thin group | Per-cast grades and buff-waste counts on healing procs, with hard-coded thresholds and caps (2 stacks, five hits). The Vivify average is the bare 8, 6, 4 even when the per-cast grade moves with Rising Mist. The Aspect of Harmony denominator is the log's player count, not the raid group. `healGcds` already prices an overhealed Vivify at the damage filler; a Zen Pulse or Black Ox waste is not priced. |
| monk-mistweaver/Defensives/use-rating | no-damage | — | Fortifying Brew; Jade Sanctuary; Elusive Mists; Ironshell Brew | a defensive that absorbed little | Each use rated by damage taken against max health (perfect at 100%, ok under 25%). Defensives are survival calls and not judged. If `lib/mitigation/` ever wants a rating of what a use absorbed, this is the nearest source. |
| monk-mistweaver/statistics | no-damage | — | many | — | Display only: the tier-set and hero-tree cards, about 40 talent healing cards, mastery, time between kicks, Vivify to Enveloping Mist ratio, cooldown throughput, casting while moving, Vivacious Vivification utilization, Sheilun's Gift clouds lost, Fortifying Brew "deaths prevented", Mystic Touch, Jadefire Stomp resets. |
| monk-shared/utility | no-damage | — | Detox, Paralysis, Ring of Peace, Leg Sweep, Roll, Chi Torpedo, Tiger's Lust, Transcendence | — | Utility and defensive cooldowns with a declared recharge and no grade. Not judged. |

Not rules (models the rules above rest on): the build chooser that picks one
of the three priority lists, the fallback list (just the top rules of the
other two), the 10.5s celestial-window exemption from the priority-list
violations (hard-coded; Conduit windows are not exempted although the guide
text says they should be), the cast-to-heal event links and normalizers,
Soothing Mist channel links, the HoT trackers and attribution, the
modeled cooldown changes (Thunder Focus Tea cutting the kick by six GCDs,
Morning Breeze resetting it, Pool of Mists trading a second off each
spell and a third Renewing Mist charge, Heart of the Jade Serpent recovery,
Gift of the Celestials, Chrysalis, Uplifted Spirits; Renewing Mist's haste
scaling and tier-set changes are not modeled), the GCD override that
ignores fabricated channel casts, mana tracking, the Secret Infusion haste
registration, the Black Ox shield classifier (a guess from the largest
shield in a batch), and the graphs. Dead config: a downtime threshold set
nothing reads, Soothing Mist's computed bad channels nothing displays.

## Candidates left

Healers are not expected to pursue damage, so expected value is low across
the board. In order:

1. **Celestial Conduit cast efficiency**: a one-line `tracked-cooldowns.ts`
   entry, same as Windwalker's. Check first on a Mistweaver log whether
   the Conduit's recast is ever below 90s (the survey says no, shortest
   91.4s). Value is small, but so is the cost.
2. **Kick drift** (Rising Sun Kick or Rushing Wind Kick) through
   `spentCooldownDrift`, with the Thunder Focus Tea and Pool of Mists
   cuts as per-event reductions and the pre-pull cast from the buff. Value
   a use from the player's own kick damage. The premise to test: do top
   Mistweavers hold the kick for heals as often as weak ones? If they do,
   it fails.
3. **Teachings of the Monastery stacks at Invoke Chi-Ji and at the cap**:
   needs the stack buff and a build with Chi-Ji; cheap to measure, low
   value.
4. **Touch of Death**: only if a surveyed Mistweaver actually casts it.

Dance of Chi-Ji is `covered` by `checkProcs` on paper; whether it fires on
a real Mistweaver pull is the first thing phase 3 should confirm.

After phase 3 (2026-10-17): 1 built (Celestial Conduit drift). The kick
rows are `unverifiable` (resets the log doesn't show). Left as measured,
unbuilt candidates: Touch of Death (287–450k a press, but 2 of 5 top
players don't press it), the two Teachings rows (negligible, fire on the
top players) and Dance of Chi-Ji (Mistweaver's proc id isn't in
`procs.ts`; no expiry on any log to measure its duration).
