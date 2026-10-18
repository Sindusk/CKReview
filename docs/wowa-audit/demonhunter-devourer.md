# WoWAnalyzer audit: Devourer Demon Hunter

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Demon Hunter shared layer,
  then the spec), spot-checked at their source lines (4 of
  4 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares patch 12.0.0 against the clone's retail 12.1.0, so it
  is **lagging**; partly maintained (a "maintained, partial" flag). Last
  change 2026-03-20, a disclaimer. 21 modules in the list, 19 owned by the
  spec; no priority list. The changelog gives no patch per module, so
  every rule is 12.0.0 as declared. **The spec's own disclaimer says its
  Reap, Cull and Eradicate logging is bugged and the analysis resting on
  it "should be ignored".** Rules that lean on Reap or Cull are doubtful
  for that reason, and every talent-dependent rule (Moment of Craving,
  Second Helping, Soul Glutton, Scythe's Embrace, Hungering Slash,
  Umbral Blade) may have changed since 12.0.0; none is made a candidate on
  the strength of its text alone. The Demon Hunter class rules (Sigil of
  Flame, Immolation Aura, Demonsurge) are not enabled for this spec; only
  Felblade's spellbook entry is inherited.
- **App:** `lib/damage/wow/specs/devourer.ts` (since phase 3: the Void
  Metamorphosis window, Eradicate overwritten), wired from `ranged.ts`;
  `tracked-cooldowns.ts` tracks The Hunt (91s, worth 0 a use: see its row);
  generic checks (`checkGcdGaps`, `checkInterrupts`, `checkDeaths`,
  `combatPotion`). **No case study** has been made on a Devourer.
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Devourer sets or
  adds.
- **Phase 3:** done 2026-10-17 (Claude Opus 5.5). All Mythic kills, 47
  Devourer player-pulls: the 40 on disk plus four fights fetched for this
  pass (Limofans VbAHWZDdPwJBajmx fight 28, Vashnik 100th; Caukyy
  JdNq6WVXbvmxDgH9 fight 19, Vashnik 99.9th, with Watchmedh; Vathiondh
  9Nfcjg6rnRkYpd2Q fight 24, Entombed Sentinels 100th, with Velfurian and
  Vålkwing; Influka PYaN4FW3VXKDThmL fight 10, Entombed Sentinels 99.9th).
  On disk the best are Felstalker (JQVkMCb8T324yWca, 99.0th), Pve (96.2nd),
  Freakerino (96.1st), Likdh (92.6th), Ercege (92.2nd); the weakest Vargona
  (X618LRt7hPqzbVJj, 3.6th), Daimian (4.3rd), Hoodh (7.7th), 月满夜丶
  (8.7th), Jexro (9.9th), 氺蘭斯氺 (10.9th). Talents from casts, buffs and
  hit ids (CombatantInfo has entry ids without names): 38 Annihilator, 9
  Void-Scarred (all 9 take The Hunt); Eradicate on 36; Moment of Craving on
  all 47; nobody casts Felblade.
  - **The Void Ray gap** (game.ts's open note): the ~1s after each Void Ray
    is an Eradicate press the log never writes. Its buff (1239524) is
    applied as the Void Ray ends and removed at the press; its hit lands
    0.23–0.27s later and the next press 0.72s (p10) after the removal, a
    GCD (1,210 of 1,287 removals; the rest are Void Metamorphosis
    transitions). Without one in between, the next press follows a Void
    Ray by 0.18s (median). Void Metamorphosis is pressed and never logged
    too: a fixed ~1.1s lock (1.07s p01, the same in and out of lust).
    Both are presses now (0937084, game.ts `devourerUnlogged`, a new
    `unloggedPresses` hook in timeline.ts): Konudh 82% → 92% GCD uptime.
    The survey also missed The Hunt and Hungering Slash, and Voidblade
    has a 0.5s GCD (c383dd5): the top players now sit at 91–94%.
  - **Built** (8e06726, `devourer.ts`, whose header holds the models and
    numbers): Void Metamorphosis window (top 0–374k a pull, weak up to
    1.70M) and Eradicate overwritten (a new loss outside any WoWAnalyzer
    rule: Xaêro KB1a9CWc6pT4VGqA 5 a pull, 1.01M; five others once or
    twice, Caukyy (99.9th) once at 6:19, 207k).
  - **Not built:** Void Ray cut short (negligible), Fury at the cap (fires
    on top players as much), smuggled Reaper's Toll (no extra Toll seen),
    Reap / Cull counts (no model), Voidstep (~14k a use), The Hunt's value
    (it would fire on every top player). Numbers in the rows.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| demonhunter-devourer/ActiveTime/guide-grade | superseded | `checkGcdGaps` | none | idle time | Perfect at no downtime, then 5 / 10 / 15% of the whole fight. The spec's own looser thresholds appear not to be read by the guide (my inference from two getter names). Counts forced downtime as idle. Phase 3 (2026-10-17): the app's own idle was overstated until two unlogged presses (Eradicate, Void Metamorphosis) and three survey misses (The Hunt, Hungering Slash, Voidblade's 0.5s GCD) were added in game.ts; top players' GCD uptime 80–82% → 91–94% (Limofans 91%, Caukyy 94%, Konudh 92%). |
| demonhunter-devourer/VoidMetamorphosis/per-cast-active-time | verified | "Void Metamorphosis window" (devourer.ts `metaWindow`) | Void Metamorphosis | idle during the transformation | Share of each window spent casting, perfect at 98%, good 95%, ok 90%; forced time inside a window counts as idle. Not a double count: idle inside the window costs more than a normal GCD, and the app has no window check for Devourer. Build as `burstGcdFindings` on the buff, valued at the window's measured bonus, less forced time. A window already open at the pull would break its end-of-window code. The window itself may still matter: see candidates. Phase 3 (2026-10-17), **built**: a GCD inside the window (1217607) is worth 1.12–2.36× one outside (the player's GCD damage there ÷ their presses there; Limofans 323k vs 165k, Vargona 270k vs 124k). `observedWindowBonus` can't read it (the window swaps Consume, Reap and Void Ray for Devour, Cull and another Void Ray id), so each missing GCD costs the window's GCD value over the player's average. Lost a pull: top Vathiondh, Influka 0, Likdh 25k, Freakerino 38k, Ercege 60k, Pve 80k, Felstalker 109k, Konudh 215k, Caukyy 217k (2:59, 42 of 44 GCDs), Limofans 374k (1–2 GCDs short a window); weak 稳重不失奔放 1.70M, Nyxh 1.38M (4:35, 27 of 36), Hoodh 1.34M, Burningpain 1.22M, 月满夜丶 1.20M, Vargona 1.19M (4:05, 8 of 15), Jexro 552k, Daimian 492k. No window is open at the pull (first entries 9.8–23.6s). |
| demonhunter-devourer/VoidMetamorphosis/per-cast-cull-count | candidate | — | Void Metamorphosis; Moment of Craving, Second Helping, Umbral Blade, Void Ray | fewer Cull casts in a window than the estimate | Expected count is window length over Reap's recharge, plus a cast per Void Ray when Moment of Craving is taken, plus one for a second charge; fail more than 4 short. **Doubtful:** the Cull logging disclaimer, hard-coded 8s and 16s durations, haste read at one moment, and resets that may have changed after 12.0.0. Would be valued as missing Cull casts times the player's average Cull in the window. Phase 3: top players' Cull counts per window against the estimate; a mistake must show fewer casts with idle GCDs spent on something weaker, not casts displaced by Void Ray or movement. Phase 3 (2026-10-17), **measured, not built**: Reap and Cull casts are logged and match their buffs and hits on all 47 player-pulls; what the log drops is Eradicate, the Reap / Cull a Void Ray empowers, which Eradicate players press instead of most plain ones. Reap / Cull presses a minute inside the window don't separate within a build: with Eradicate 0–9.5 (Limofans 0.3, Caukyy 2.3, Ercege 5.4; Vargona 1.7, Jexro 0.0), without it 5.5–16.6 (Vathiondh 9.0, Felstalker 11.2; Daimian 11.7, 氺蘭斯氺 5.5). No recharge model: Moment of Craving resets it after every Void Ray (refreshed unspent 0–9 times a pull, top Vathiondh 5, Limofans 4, as weak Jexro 6). |
| demonhunter-devourer/VoidMetamorphosis/per-cast-smuggled-toll | wrong | — | Hungering Slash, Voidblade, The Hunt | entering the transformation without the Reaper's Toll buff up | Pressing Voidblade or The Hunt just before entering converts it, giving a third Toll instead of two. Two-level, log-visible (buff at the cast). **Doubtful:** Hungering Slash and the Toll mechanic may have changed since 12.0.0, and a first cast where it couldn't be done reads Fail. Value: one extra Reaper's Toll hit. Phase 3: how many top players smuggle every cast; if most do not, it is a build-dependent habit. Phase 3 (2026-10-17), **proposed `wrong`** (for the user's review): on the 9 Void-Scarred player-pulls a Voidblade or The Hunt 0.3–1.8s before the entry does put the Reaper's Toll buff (1245523) up at the entry, but the window gets no more Tolls for it: Vathiondh (100th) 5 and 6 Tolls in the two windows without it, 4, 5 and 7 with; Influka (99.9th) 5–6 either way. Both skip it in 2–3 of 5 windows; Limofans (100th) and Cinderdh do it every time, 丨恶魔果子丨 never (1–3 Tolls a window, the fewest). A Toll's Hungering Slash hit is 143–618k a press. |
| demonhunter-devourer/VoidMetamorphosis/per-cast-rollup | superseded | — | as the items | — | Average of its items' marks. Inherits their doubts. |
| demonhunter-devourer/Reap/soul-gating-cast | unverifiable | — | Soul Glutton, Scythe's Embrace, Moment of Craving | Reap cast with souls to spare, or too few gained | Without Scythe's Embrace, Reap is a soul top-up for entering the transformation (entry cost, per-cast capacity and a 4-short band are hard-coded); with it, only a cast-efficiency bar. The spec's own disclaimer says Reap logging is bugged, and pre-pull souls aren't handled. Indirect at best (a delayed transformation). Phase 3 (2026-10-17): Reap itself logs fine (casts, buff 1226019 and hits 1225823 match on all 47); the soul counter toward the transformation is a stacking buff (1225789) the log carries, but what a Reap should have gathered isn't, so still indirect. |
| demonhunter-devourer/VoidRay/full-channel | candidate | — | Void Ray (Final Breath, Moment of Craving, Eradicate, Voidfall pay out at the end) | a Void Ray cut before its last ticks | Good at 19 of 21 ticks landed. **Hard-coded** tick count and a 3.2s link window; a target dying or going untargetable would read Fail. Not covered by `checkInterrupts` unless it counts a channel broken early (unchecked). Value: lost ticks at the cast's own damage per tick, plus the end payout. Phase 3: read the actual tick count from the log rather than 21; separate a broken channel from forced movement or an untargetable boss. Phase 3 (2026-10-17), **measured, not built** (negligible): a full channel lands 20 tick instants on its target (1,502 of ~1,650; the hits come in two interleaved series, 21 hits in all), and so do 95 of the 113 channels with a press at the buff's removal. Under 18 ticks ~35 times on 47 pulls, mostly a target dying; a tick is ~15k, and the Eradicate the end grants comes either way. |
| demonhunter-devourer/Voidstep/consumed-rate | candidate | — | Hungering Slash, Vengeful Retreat | a Voidstep proc not spent on a Vengeful Retreat | Perfect at 100%, good 90%, ok 75%. Forced movement and mechanics that prevent a retreat aren't handled. The damage value of the free retreat is unclear: **expected value is low** unless a log shows the follow-up hit. Phase 3 (2026-10-17), **measured, not built** (negligible): Voidstep (1223157) lasts 6.0s (unspent spans end at 6.0s); a spent one is worth its Voidstep hit (1239526), ~14k (Influka 321k over 23). The 100th-percentile Limofans spends none of 22, 闹米的揪揪 2 of 20; Influka 23 of 23, Velfurian 23 of 25. Listed in procs.ts as measured and left out. |
| demonhunter-devourer/Voidstep/expired-rate | superseded | — | Hungering Slash | — | The unused slice of the same procs as consumed-rate (perfect only at 0%, fail above 25%). |
| demonhunter-devourer/Voidstep/overwritten-rate | superseded | — | Hungering Slash | — | The refreshed-before-use slice of the same procs. |
| demonhunter-devourer/FuryTracker/time-at-cap | wrong | — | none | Fury at the cap | Defined but nothing in the guide reads it (dead code). Perfect up to 15% of the fight at cap, a generous bar that probably reflects pooling. The app's `primaryResourceCapFindings` isn't wired for Devourer and Fury is not in its list; whether the log carries Fury events here is unchecked. Value: Fury generated into a full bar. Phase 3: waste by top players. Phase 3 (2026-10-17), **proposed `wrong`** (for the user's review): Fury (type 17, max 120, 140 with a talent) is logged on every cast. Inside Void Metamorphosis it sits at 118–120 by design until the drain empties it and ends the window. Outside, casts at the cap (not Void Ray) run 0–10 a minute with no order: top Caukyy 7.3, Ercege 7.3, Limofans 6.2, Vathiondh 0, Felstalker 0; weak Daimian 8.8, Jexro 5.9, Vargona 1.1, 月满夜丶 1.3. Void Ray waits on its own recast (4.3s+ apart outside the window, p05), not on Fury: Consume is pressed at 100+ Fury 9–39 times a pull on every player. Not wired. |
| demonhunter-devourer/FuryDetails/waste-share | superseded | — | none | — | Wasted over generated, 15 / 20 / 25%; a getter with no caller. Same loss as the cap row. |
| demonhunter-devourer/Abilities/the-hunt-efficiency | candidate | `checkCooldownDrift` (The Hunt, 91s; worth 0 a use, so it never reports) | The Hunt; Violent Transformation (entering the transformation resets Voidblade and The Hunt) | The Hunt held | WoWAnalyzer sets no target for it, only a cooldown category. Tracked in the app (unverified, 2 players; shortest 91.6s, median 105.6s). The reset only shortens real intervals, so using the shortest erring lenient is right. Forced time counts as ready in WoWAnalyzer. Phase 3 (2026-10-17): was `covered`, but the covering check never fires: The Hunt's hits log under 1246169 (its impact, a twin cast 0.27s after the 0.77s cast; Predator's Wake casts it too) and 1246168 (a DoT), so a use read 0. All 9 players who take it (the Void-Scarred ones) press it only 1–3 times a pull: top Limofans 3 in 6:21, Vathiondh 3 in 6:00, Influka 3 in 5:27, Felstalker 3 in 5:17; weaker 丨恶魔果子丨 3 in 6:57, 闹米的揪揪 2 in 6:24, Kraa 2 in 7:00, Cinderdh 1 in 4:42. 9 of the 23 presses come 0.3–2.0s before a Void Metamorphosis, which resets it (shortest interval 43.6s, Felstalker 0:15 → 0:59). Holds of 146–210s on the top players (Felstalker, Influka, Limofans, Vathiondh). Valued at its hits it would fire on them (1–2 uses a pull) about as on the weak (2–3); no rule separates. Left inert, with this in tracked-cooldowns.ts. |
| demonhunter-devourer/Abilities/reap-cull-efficiency | candidate | — | Second Helping (extra charge), Umbral Blade (haste-scaled recharge); Mass Acceleration and Moment of Craving reset it | Reap or Cull held | No target set; only a bar when Scythe's Embrace is taken. Not tracked in the app. A short recharge spreads too far for the fixed-interval check because the two resets are not a fixed amount: they would need a custom model, not `spentCooldownDrift`'s per-event reduction. GCD-bound, and the Reap/Cull disclaimer applies. **Very low expected value.** Phase 3 (2026-10-17), **measured, not built**: see the cull-count row (no model fits; rates don't separate). |
| demonhunter-devourer/Abilities/felblade-cast-efficiency | unverifiable | — | Felblade | Felblade held | 95% target, class layer. A source comment admits Demon Bite's reset can't be seen in events, so held time can't be told from a reset. Fury builder; indirect. Phase 3 (2026-10-17): no Felblade cast on any of the 47 player-pulls. Void-Scarred's Voidblade takes its place, with the same 0.5s GCD of its own (game.ts). |
| demonhunter-devourer/Abilities/spellbook-no-target | no-damage | — | — | — | Voidblade (30s), Vengeful Retreat (25s), Void Metamorphosis (none declared), Shift, Collapsing Star and the other spellbook entries have no efficiency target. Arcane Torrent's efficiency is switched off (no throughput). Phase 3 (2026-10-17): checked Collapsing Star, the spec's biggest hit (0.70–1.81M a cast), since it hides damage: every player casts about one per Void Ray inside the window, top and weak alike (2–12 Void Rays a pull with no Star after them, Caukyy 12, Burningpain 10), and none outside it. Nothing to price. |
| demonhunter-devourer/Blur/mitigation-model | no-damage | — | Demonic Resilience | — | Blur as 25% reduction in the major-defensive framework. |
| demonhunter-devourer/statistics | no-damage | — | — | — | Display only: Fury wasted and Fury usage tab, Fury graph, transformation uptime bar, damage done while transformed, core Channeling and aura statistics. |
| demonhunter-shared/utility | no-damage | — | — | — | Glide, Disrupt, Torment, Spectral Sight, Chaos Nova, Consume Magic, Sigil of Misery, Darkness, Blur. Utility and defensives aren't judged. |

Not rules (models the rules above rest on): the Void Metamorphosis
normalizer that fabricates a cast from the buff (its comment dates it to
the 12.0.0 prepatch; may be stale), the Void Ray event link, the Fury
tracker and graph, the Collapsing Star stand-in (a temporary registration
as a spender), the Cull module (a stub that does nothing), the cooldown
reset models (Mass Acceleration, Moment of Craving, Violent
Transformation), the Preparation section and the Defensives shell. The
class-layer rules (Sigil of Flame, Immolation Aura, Demonsurge) are not
enabled for Devourer. Phase 3 (2026-10-17): the normalizer's premise
holds (Void Metamorphosis is never logged as a cast); the app reads the
press from the buff too (game.ts).

## Candidates left

After phase 3 (2026-10-17), all measured and left unbuilt: Cull count per
window and Reap / Cull efficiency (no recharge model), Void Ray full
channel and Voidstep (negligible), The Hunt held (fires on every top
player). Proposed `wrong` for the user's review: smuggled Reaper's Toll,
Fury at the cap.
