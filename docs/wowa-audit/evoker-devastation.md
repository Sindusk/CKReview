# WoWAnalyzer audit: Devastation Evoker

- **Clone:** WoWAnalyzer `0ffe84575780ee3d3fae9ef29f0791dd135d0fc9`
  (branch `midnight`, 2026-10-13), read 2026-10-16 in the fan-out
  workflow. Records extracted by Sonnet subagents (Evoker shared layer,
  then the spec), spot-checked at their source lines (4 of
  4 matched), and the ledger drafted by a Sonnet
  subagent, then reviewed in the main session. Reference only (AGPL): our
  own words, no ids or tables taken.
- **Spec:** declares 12.1.0, fully maintained; last change 2026-10-12
  (small Disintegrate fixes; Disintegrate and its proc visuals were
  rewritten 2026-09-13 and graded more finely 2026-09-24). **No priority
  list is live:** the three priority-list files exist but are switched off
  in the parser and the guide only prints a notice, so the spec has no
  rotation-order grade at all. No checklist either; every grade is a guide
  section or a suggestion threshold.
- **App:** `lib/damage/wow/specs/ranged.ts` (`"Devastation Evoker"`:
  Dragonrage window, Strafing Run expiry), `tracked-cooldowns.ts`
  (Dragonrage, Tip the Scales), `potion.ts`, generic checks. Essence is
  not a judged resource (logged on spenders only). Case study:
  qpZx3mWaG7gcDdYB pull 3 (Bragontix, Scalecommander) against WoWAnalyzer's
  page; the header of ranged.ts records what matched. No second page or
  reference player was recorded for this spec.
- **Phase 3 (2026-10-17):** done (Claude Opus 5.5). Measured on 19
  Devastation player-pulls of 17 players, all Mythic kills: 16 already on
  disk and three top kills fetched for this pass (vRPGT4MN6VALQWFh fights
  22 and 27, fcj1YgaCJBT2kXFm fight 23). Top: Mythvoker (Entombed
  Sentinels 100th, Vashnik 99.0th), Tëemo (Vashnik 100th), Galakrussy
  (dG8D9y6WxrfmtgXp, 99.7th), Fistlad (Kag91qVZ2YJ7MQAb, 99.4th),
  Aqrippae (MLy7nw8kaW1D394Y, 98.2nd), Elfuêgo (r9CX1kpRGLmKJH4M,
  94.2nd), Millzd (89.7th / 83.5th). Weak: Brakkarion (atJRCq3YM8P4KGpD,
  1st), Skysong (1NL29tyvbzGhZgPK, 9.3rd), Qiyue (VbAHWZDdPwJBajmx,
  16.0th), Lanidra (fh6bLKy12gzWvGCH, 16.7th), 夜漪微澜 (32.4th), Emerie
  (nhbCYHXRf1T2qAv9, 32.7th), Meatbulb (47.1st), Jorblóx (48.0th), Asuia
  (68.8th), and the static's Bragontix. Talents (casts and buffs): 18 of
  19 Scalecommander (Deep Breath, Strafing Run, Mass Disintegrate), Emerie
  Flameshaper; all take Dragonrage, Tip the Scales, Font of Magic,
  Burnout, Essence Burst, Leaping Flames and Imminent Destruction; Unbound
  Flame on five; nobody takes Azure Sweep or Firestorm.
  **Engine:** a Disintegrate clipped before its last tick read as ~0.4s
  of idle a clip (the lock ran to the last tick seen): 5–9s a pull on the
  top players. Its lock now runs to the next press (timeline.ts
  `channelLocks`, game.ts `CHANNEL_TICKS`; 951077b), and a tracked
  cooldown used before the pull is seen by its own status
  (`prePullStatusIds`, 1ab6be9). **Built:** Disintegrate ticks clipped
  (a010ab8), Dragonrage drift valued (664694e: it was worth 0 a use),
  Fire Breath and Eternity Surge held on a fitted Causality model
  (e512270), Essence Burst expiry (procs.ts, 33e0cac). The header of
  specs/devastation.ts has every model and number. Re-run on the top
  players: the Dragonrage window fires on them about as on the weak (top
  0–663k, Galakrussy 23 of 28 GCDs at 0:03; weak 0–662k); its missing
  GCDs are real sub-second delays priced at the window's bonus only, so
  it was kept. Strafing Run expired fires on no top player (weak up to
  2.78M).
- **Core rules** (active time, cast efficiency, potions, cancelled casts)
  are in [core.md](core.md); rows below cover only what Devastation sets or
  adds. The Evoker shared layer (Fire Breath target, proc-buff verdicts,
  Imminent Destruction, Leaping Flames, Mass Disintegrate) is included here
  because Devastation is the spec that uses it.

## Ledger

| id | status | app check | talents | fires-on | notes |
|---|---|---|---|---|---|
| evoker-devastation/Abilities/dragonrage-efficiency | verified | `checkCooldownDrift` (Dragonrage, 120s, `dragonrageValue` in specs/devastation.ts) | Dragonrage | Dragonrage held | 95% target (major below 90%), whole fight, fixed 120s. Case study: 3 casts, WoWAnalyzer 87% counted a 2:03 to 2:46 hold that ran into Stasis (2:29 to 2:48); three full windows beat four with two cut, so no lost use. It counts forced time as ready and expects an end-of-fight use. Phase 3 (2026-10-17): the tracked cooldown was worth 0 a use (Dragonrage has no hits of its own), so its drift never reported. Valued now by the Essence Bursts a window adds (0.15–0.39 gains a second inside against 0.06–0.15 outside, 3–8 a use) at a Disintegrate over a Living Flame, plus the Pyres the cast exhales: 1.0–3.3M a use. Hold windows excused (`burstHold`); a pre-pull Dragonrage counts (Mythvoker, Vashnik, read 117.6s held before). No top player loses a use; Qiyue 1.22M (ready 6:22 of a 6:35 kill), Emerie 783k (2:01 → 2:42). |
| evoker-devastation/Abilities/tip-the-scales | no-damage | `checkCooldownDrift` (Tip the Scales, 120s) | Tip the Scales | — | WoWAnalyzer gives it no target (bar only); the app tracks it as a plain recast. Nothing to reconcile. Phase 3 (2026-10-17): still worth 0 a use, left so: it makes one empower instant at full rank, and every player here releases theirs at 0.5–1.1s of charge on average, so a use saves about half a GCD (~0.1–0.2M). Held 48s+ by Mythvoker (Vashnik 2:27 → 3:15), Qiyue, Emerie and Elfuêgo. |
| evoker-devastation/Abilities/eternity-surge-efficiency | covered | `empowersHeld` (specs/devastation.ts) | Eternity Surge; Event Horizon; Causality; Font of Magic | an empower held past ready | 95% target, whole fight. Not tracked: the recharge is cut by Causality (about half a second per Disintegrate tick, a smaller amount per Pyre hit), Azure Sweep with the season 1 tier set, and Event Horizon (3s, static). Case study: "sat ready" 82%, left open because the rule was not pinned from one player. Phase 3 (2026-10-17): fitted on 319 intervals of the 18 Scalecommander player-pulls, 26.0s less 0.55s a Disintegrate tick instant and 0.3s a Pyre hit (3 under the line; a re-press within 5s after a cancel is one press). Held = ready → next press less forced, dead, movement, hold-window time and 3s a cycle; holds lined up into the first 6s of a Dragonrage excused. Valued per held second as the press (286–585k) less a Living Flame ÷ the average recharge (14–17s). Top 0–84k a pull (Fistlad 84k, Galakrussy 82k at 0:47), weak up to 613k (Emerie, Flameshaper: 0:57, 2:58, 3:43, 5:45), Bragontix 287k, Jorblóx 193k (ready 2:27, pressed 3:00). |
| evoker-devastation/Abilities/fire-breath-efficiency | covered | `empowersHeld` (specs/devastation.ts) | Fire Breath; Ashes in Motion; Interwoven Threads; Legacy of the Lifebinder; Causality | an empower held past ready | 95% target, whole fight, graded for this spec only (the shared source's spec test matches only Devastation). Case study "sat ready" 86%, open. Same reduction model and the same obstacles as Eternity Surge, plus charge and talent-driven base recharge (30s, 5s shorter, 0.9 multiplier). Phase 3 (2026-10-17): built with Eternity Surge. Fitted 29.5s less 0.6s a Disintegrate tick and 0.3s a Pyre hit (1 of 287 intervals under the line). Emerie's Flameshaper Fire Breath doesn't fit it (19 of 26 under) and isn't judged. Top 0–101k a pull (Tëemo 101k: ready 0:55, pressed 1:04), weak up to 112k (Jorblóx 112k: ready 2:42, pressed 3:01; Lanidra 103k, Meatbulb 94k). |
| evoker-devastation/Abilities/other-cooldowns | no-damage | — | Deep Breath; Maneuverability; Onyx Legacy | — | Deep Breath, Tip the Scales and all utility are declared without a target. Deep Breath's second cast is the Strafing Run row. |
| evoker-devastation/CoreSection/essence-time-at-cap | unverifiable | — | Power Nexus (cap 5 to 6) | Essence full | Perfect at 10% or less of the fight at cap, Fail above 20%, whole fight. The log shows Essence only on the casts that spend it, so time sitting at the cap is not visible (the case study found WoWAnalyzer's waste at 12.7% "good" and did not adopt it). The app's `primaryResourceCapFindings` skips Evoker for the same reason. The intermission caveat in WoWAnalyzer's own text is never subtracted. Phase 3 (2026-10-17), **proposed `wrong`** (for the user's review): rebuilt from the paid Disintegrates' snapshots (regen fitted on intervals ending under the cap, 21–36 a minute), waste is 9–17% of generation on the top players (Tëemo 9%, Mythvoker 11% / 17%, Aqrippae 14%, Galakrussy 16%, Fistlad 16%) and 4–24% on the weak (夜漪微澜 4%, Lanidra 12%, Qiyue 15%, Meatbulb 20%, Bragontix 24% with Stasis in it); paid Disintegrates cast at the cap 14–34% top, 11–41% weak. No separation (forced time not removed in this rebuild). |
| evoker-devastation/CoreSection/active-time | superseded | `checkGcdGaps` | none | idle time | Perfect at no downtime, Good to 5%, Ok to 10%, whole fight, Stasis counted as idle. The app values each gap less forced time. Fixed in the engine from the case study: Deep Breath's flight no longer reads as idle (`lockStatus`) and empowers are no longer read as cancelled. Phase 3 (2026-10-17): a clipped Disintegrate no longer reads as idle either (`channelTicks`): 3–14s a pull had read as small GCD delays (Galakrussy 7.4s, Elfuêgo 13.6s). |
| evoker-devastation/CancelledCasts/cancel-rate | verified | `checkInterrupts` | none | a cast cut by movement | Suggestion above 5 / 7.5 / 10% of casts; the guide's colour bands (1% perfect, 7.5% good) disagree with it. Case study: 4 cancelled Living Flames matched. Counts boss interrupts and forced movement too. |
| evoker-devastation/DragonRage/extensions-per-window | covered | `empowersHeld` (specs/devastation.ts), `burstGcdFindings` (Dragonrage) | Dragonrage; Animosity | a Dragonrage window with few empowers | Perfect at 6 or more finished empowers in the window, Good at 4, else Fail (Ok if the kill cut the window). The cutoffs ignore window length and Animosity ranks. The app's `window` check already values the missing GCDs inside Dragonrage (`burstGcdFindings`), which would also catch idle but not a window spent on fillers instead of empowers. Phase 3 (2026-10-17): a window spent on fillers with the empowers still recharging loses nothing; one with an empower ready and not pressed is `empowersHeld`'s (its held time inside the window counts like any other). Windows run 25–34s (Animosity merged); empowers released 4–6 in each on the top players (Mythvoker 6 / 5 / 4, Aqrippae 6 / 5 / 4, Galakrussy 5 / 4 / 4) and 2–6 on the weak (夜漪微澜 3 / 2 / 3, Meatbulb 4 / 3 / 4). |
| evoker-devastation/DragonRage/per-empower-count | wrong | `burstGcdFindings` (Dragonrage) | Dragonrage | fewer than 2 of an empower in a window | Perfect at 3, Good at 2, per empower, in a window. A second grading of the same window as the extensions row, with counts a 27 to 30s cooldown cannot meet in a short window. Fire Breath and Eternity Surge are held to the same count whatever their readiness. Phase 3 (2026-10-17), kept `wrong`: each empower comes 2–3 times in a 32–34s window on the top players (3 only in the opener, with Tip the Scales), and the weak match them (Qiyue, Jorblóx, Bragontix 3 / 2 / 2 as Mythvoker, Millzd, Fistlad); the count is set by the recharge, and holds are `empowersHeld`'s. |
| evoker-devastation/Disintegrate/tick-efficiency-outside-dragonrage | covered | `ticksClipped` (specs/devastation.ts) | hero tree (Scalecommander, Flameshaper); Mass Disintegrate; Azure Celerity | ticks dropped by a clipped or cancelled Disintegrate | Ticks dealt over ticks the casts could have dealt: Flameshaper Perfect 95%, Scalecommander 100%. Case study: Disintegrate tick efficiency 340 of 385 (88%), left open. Phase 3 (2026-10-17): Disintegrate ticks at the cast and every T after, 5 in a full channel; the k-th lands only when the next press starts past (k − 1)T, and chaining it onto itself carries one tick into the new channel. Built as "Disintegrate ticks clipped": each tick a press dropped (a chain's carried one excepted) at the player's Disintegrate damage per tick instant (76–113k), less the time the clip gained at their GCD rate, so a last tick dropped 10–50ms early costs a whole tick and an early clip for an empower about breaks even; forced and movement time excused. Top 150–960k a pull (Tëemo 960k: a Burnout Living Flame 10ms before the last tick at 3:33 and 4:23), weak 88k–2.44M (Elfuêgo 2.44M, Qiyue 1.42M, Skysong 1.22M). It fires on top players too, but a clip of the last tick alone comes 3–13 times a pull on them (median 6) against 7–24 on the weak (median 14); Bragontix 380 / 415 ticks here against WoWAnalyzer's 340 / 385 (chains counted as carried). Jitter checked (main session's question): the press's margin before the dropped tick's due time is spread alike on top and weak (under 150ms: 68 of 125 top clips, 81 of 166 weak; 150ms+: 57 and 85), so no tolerance was added. |
| evoker-devastation/Disintegrate/tick-efficiency-dragonrage | covered | `ticksClipped` (specs/devastation.ts) | Dragonrage; hero tree | — | The same ratio computed for casts started while Dragonrage is up; the split is only by buff state at the cast start. Phase 3 (2026-10-17): `ticksClipped` counts every Disintegrate, in or out of the window. |
| evoker-devastation/Disintegrate/mass-disintegrate-ticks | wrong | — | Mass Disintegrate (Scalecommander); Concentrated Power | a Mass Disintegrate losing ticks on one target | Compares ticks on all targets with targets times ticks. The target count comes from the cast link, and any average above one target excuses lost ticks, so it neither scores cleave nor tells a dying add from a mistake. Phase 3 (2026-10-17), kept `wrong`: the extra targets' ticks land at an offset on their own targets (0:08.8 on Galakrussy: two series 0.2s apart), and how many targets a Mass Disintegrate finds is the fight's. A clipped Mass Disintegrate's lost targets are in `ticksClipped`, whose tick price is all targets' Disintegrate damage per tick instant. |
| evoker-devastation/Disintegrate/per-cast-chain | covered | `ticksClipped` (specs/devastation.ts) | hero tree | a recast with 2 or more ticks left, or onto another target | A per-cast view of the same tick loss, with a target swap graded Bad even when a mechanic forced it. Phase 3 (2026-10-17): a chain carries one tick (after a chain that dropped one, 10 of 22 next channels ran to six ticks), so only ticks past it count, as WoWAnalyzer's 2-ticks-left line has it. |
| evoker-devastation/Disintegrate/per-cast-clip | covered | `ticksClipped` (specs/devastation.ts) | hero tree (clip allowed as Flameshaper) | a clip by anything but Fire Breath, Eternity Surge or Deep Breath | A per-cast view of the same tick loss, with a hard-coded list of good clippers. Phase 3 (2026-10-17): no list of good clippers; a clip is priced by its dropped ticks less the time it gained, which makes early clips for an empower about free whatever the hero tree. |
| evoker-devastation/Disintegrate/per-cast-cancel | wrong | `checkInterrupts` | none | a channel stopped with ticks left | Any lost tick is Fail, forced movement, stuns, deaths and a dying target included. The cancelled-cast check already counts the movement cost with forced windows removed. Phase 3 (2026-10-17), kept `wrong`: channels that stop short with no press after them for 4s+ drop 0–4 ticks a pull on the top players (Mythvoker 4, Tëemo 2) and 0–9 on the weak (Meatbulb 9, Asuia 7, Elfuêgo 7, Lanidra 6): movement and targets dying, not judged; the idle after them is the gap check's. |
| evoker-devastation/Disintegrate/window-rating | superseded | — | Dragonrage | — | The floored average of the tick figures per window, with windows of very different lengths. Subsumed by the tick-efficiency candidate. |
| evoker-devastation/EssenceBurst/expired-wasted | covered | `checkProcs` (lib/damage/wow/procs.ts) | Essence Burst; Essence Attunement | a stack falling off unspent | Binary Good or Fail per stack; overcap is not graded. Case study: not adopted, 3 expiries across the pull, each worth well under a GCD. Phase 3 (2026-10-17): `checkProcs` didn't see it (no duration). Measured 15s: 2 of 753 gains run out at 15.00–15.01s on the 19 player-pulls (Millzd 4:26 in Stasis, forced; Qiyue 6:16 after he stopped casting), the next longest 13.99s, each beside a Disintegrate. Added to procs.ts, consumers Disintegrate and Pyre, valued at a whole Disintegrate (an upper bound). |
| evoker-devastation/Burnout/decayed | candidate | `checkProcs` (expiries; whether it sees this buff: phase 3) | Burnout | a charge decaying unused | Case study: 3 expiries outside the death, each well under a GCD. Same value and caveats as Essence Burst. Phase 3 (2026-10-17), **not built, negligible:** 15s, 28 run out at 15.02–15.03s on 14 of 19 players, the top ones too (Galakrussy, Mythvoker, Tëemo 2 each, Fistlad 1; Millzd 6, Bragontix 4). It makes a Living Flame instant, so what one loses is the cast time over a GCD (~0.5s), not a press (procs.ts). |
| evoker-devastation/UnboundFlame/stacks-and-essence-burst | candidate | — | Rising Fury; Essence Burst | four charges after Dragonrage left to decay, or a cast with Essence Burst already up | Binary. The charges are a post-Dragonrage filler with an Essence Burst chance; refreshing a held Essence Burst is the only overcap. Not adopted in the case study as part of the proc expiries. Low value. Phase 3 (2026-10-17), **not built, negligible:** Unbound Flame on 5 of 19 players, 1 charge of 21 gains removed unused (夜漪微澜, at 89s). |
| evoker-devastation/AzureSweep/expired-overcap-refresh | candidate | — | Azure Sweep; season 1 tier set | an Eternity Surge cast with two Azure Sweeps held, or letting them expire | Binary, including overcap and refresh (this module turns both on, correcting the shared ledger). Not looked at in the case study. Low value; a free instant spender. Phase 3 (2026-10-17), **not measured:** no Azure Sweep buff or cast on any of the 19 player-pulls (top and weak); it can't fire here. |
| evoker-devastation/StrafingRun/buff-expired | verified | `strafingRun` (ranged.ts) | Strafing Run; Maneuverability; Mass Disintegrate | the second Deep Breath not made within 18s | Case study: 6 of 7 used on both sides; the one from 1:57 ran out at 2:15. The app values the lost Deep Breath with its Melt Armor damage less the flight's lock. WoWAnalyzer's advice that Scalecommanders should wait as long as possible is prose, not graded. Phase 3 (2026-10-17): fires on no top player; weak Brakkarion 2.78M (2), Skysong 1.87M (3: 1:38, 2:54, 4:53), Lanidra 545k, Asuia 485k, 夜漪微澜 348k, Jorblóx 257k, Bragontix 134k. |
| evoker-devastation/DamageEfficiency/imminent-destruction | candidate | — | Imminent Destruction | stacks left unspent when the buff falls off | Each stack that goes unspent is Fail; the displayed utilization (Perfect 100%, Good 95%, Ok 80%) divides by a different figure than the rating. Case study: 1 expiry, not adopted. Low value. Phase 3 (2026-10-17), **not built:** a 30s buff, 42 of 103 removals at 30.02–30.03s with stacks left, on 15 of 19 players and every top one 2–4 times a pull (Mythvoker, Tëemo 4, Galakrussy 3, Fistlad, Aqrippae 2) as on the weak (Meatbulb 6, Qiyue 4). Not a separating loss; no value per stack was measured. |
| evoker-devastation/DamageEfficiency/leaping-flames | candidate | — | Leaping Flames | a Fire Breath charge left to decay | Binary, lenient inside Dragonrage. Case study: 1 expiry, not adopted. Low value; the grade ignores cleave. Phase 3 (2026-10-17), **not built, negligible:** no duration (unused spans 6–41s), 18 removals without a Living Flame of 318, on top players too (Mythvoker, Tëemo 2, Fistlad 1); one is a few Living Flame bounces. |
| evoker-devastation/DamageEfficiency/mass-disintegrate-buff | candidate | — | Mass Disintegrate (Scalecommander) | a stack expiring or overcapped | Binary. Case study: 1 expiry, not adopted. Low value; target count is not scored. Phase 3 (2026-10-17), **not built, negligible:** 15s, 3 of 516 removals with no Disintegrate beside them (Skysong, Meatbulb, Bragontix), 2 of them at 15.0s. |
| evoker-shared/ProcBuffAnalyzer/fight-end-leftover | wrong | — | per proc | stacks held at fight end | An Ok entry for any proc still held when the fight ends, though the section says such procs are excluded. A kill or wipe is not told apart from a played-out kill. Phase 3 (2026-10-17), kept `wrong`: a proc held at the kill is spent by nothing; `checkProcs` and the checks here end at the kill. |
| evoker-shared/Abilities/disintegrate-no-target | no-damage | — | none | — | Filler spells (Disintegrate, Living Flame, Azure Strike) carry no cast-efficiency target. Listed so nothing is invented for them. |
| evoker-devastation/utility | no-damage | — | Obsidian Scales; Zephyr; Hover; Time Spiral; Rescue; Source of Magic and others | — | Defensives, mobility and utility have fixed cooldowns and no efficiency target; the Defensives guide section is prose and a timeline. Utility and defensives are not judged. |
| evoker-devastation/statistics | no-damage | — | — | — | Display only: Arcane Intensity, Catalyze, Causality (reduction by source, effective against wasted), Consume Flame, Engulfing Blaze, Eye of Infinity, Heat Wave, Honed Aggression, Iridescence, Lay Waste, Rising Fury, Scintillation, Scorching Embers, Shattering Stars, Spellweaver's Dominance, Star Salvo, Strafing Run damage, Titanic Wrath, Volatility, Pyre damage split, the season 1 and 2 tier-set statistics, the hero-tree statistic modules, the empower rank chart, the Dragonrage damage summary and the timeline highlights. |

## Not rules

Models the rules above rest on: the Disintegrate tracker and its
Dragonrage windows (Mythic Plus pull windows exclude trash), the Essence
resource tracker (cap 5, 6 with Power Nexus), the empower cooldown model in
which an unreleased empower does not start its recharge, the Causality,
season tier-set, Event Horizon and Wingleader cooldown reductions, the
Strafing Run cooldown handling, the cast-link, Essence Burst and
Disintegrate-chain normalizers (their time buffers are hand-tuned), the
invalid-event remover, and the buff timeline. The three priority-list files
are dead code.

## Candidates left

Phase 3 (2026-10-17) worked the list below; what's left is negligible.

1. **Disintegrate tick efficiency:** built (`ticksClipped`), with the
   engine's channel lock fixed first.
2. **Dragonrage empower count per window:** covered by `empowersHeld`
   (an empower ready in the window and not pressed) and the window check.
3. **Fire Breath and Eternity Surge efficiency:** built (`empowersHeld`)
   on a fitted Causality model.
4. **Proc expiries:** Essence Burst added to procs.ts. Burnout, Imminent
   Destruction, Leaping Flames, Mass Disintegrate and Unbound Flame were
   measured and left unbuilt (negligible, or every top player lets them
   lapse); Azure Sweep isn't taken by anyone sampled.
