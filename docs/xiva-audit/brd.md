# xivanalysis audit: Bard

- **Clone:** xivanalysis `f532855e635bdfb4211cec8128d582dadfdc6a75`
  (2026-09-25), read 2026-10-15. Bard sources are in
  `src/parser/jobs/brd/modules/`; core ones are in
  `src/parser/core/modules/` (records in [core.md](core.md)).
- **Patch:** the Bard modules have no patch branches; supported 7.0–7.5.
  The data layers change potencies only (Ladonsbite and Shadowbite in 7.2;
  Resonant Arrow and Radiant Encore in 7.3; Apex Arrow, Blast Arrow and
  Radiant Encore in 7.4). The app values actions from the log, so none of
  these changes a rule.
- **App:** `lib/damage/ffxiv/jobs/ranged.ts` (header, `BRD_CHECKS`),
  `tracked-cooldowns.ts` ("Bard"), `game.ts` (Army's Muse haste),
  generic checks in `lib/damage/checks.ts`. No Bard gauge lanes in
  `gauges.ts`.
- **Method:** pilot, extracted by hand. The firing evidence is the
  ranged.ts header plus one run on 2026-10-15 of
  `validate.js damage-analysis` over the Bard samples on disk
  (6XaWqwMbkZG9pLmx, r4qDkR9btJCXnKWd, yBKPqGwHparm7Tk4).
  No Bard xivanalysis page is saved in `sampledata/damage-ff/`.

## Ledger

| id | status | app check | fires-on | notes |
|---|---|---|---|---|
| brd/BurstWindow/gcd-count | verified | `bardBurst` expectedGcds | fewer than 7 GCDs in the RS+BV+RF overlap (8 when 2+ GCDs fall under Army's Muse) | Matched on dDar482XvFKBPJYh FRU (6 missing) and qjCMx4bRfgNKwX9T fight 16 (18, window by window). |
| brd/BurstWindow/barrage | verified | `bardBurst` Barrage | Barrage not consumed by a Refulgent / Shadowbite inside the window | Same test as xivanalysis: Barrage's removal after the first consumer and before the window ends. FRU 7 matched. |
| brd/BurstWindow/iron-jaws | verified | `bardBurst` Iron Jaws | no Iron Jaws in the window (one per enemy the Bard hit in it) | FRU 7 and fight 16 ×4 matched. |
| brd/BurstWindow/apex-blast | verified | `bardBurst` Apex / Blast | no Apex Arrow or Blast Arrow in a window after the first minute | FRU 2 matched. |
| brd/BurstWindow/encore-resonant | verified | `bardBurst` Radiant Encore / Resonant | either one missing | FRU 1 and fight 16 Resonant ×3 matched. |
| brd/BurstWindow/ea-sidewinder | verified | `bardBurst` Empyreal / Sidewinder | either one missing | FRU 3 and fight 16 Sidewinder matched. |
| brd/BurstWindow/heartbreak | verified | `bardBurst` Heartbreak Shot | under 3 Heartbreak Shot / Rain of Death in the window | FRU 6 and fight 16 ×2 matched. |
| brd/BurstWindow/end-of-pull | superseded | burst window cut short by the kill (dps-analysis.md) | a window the kill cuts short | xivanalysis drops each expectation by a fixed amount (oGCDs to 0; IJ and Barrage −1; only Encore). The app keeps the GCDs that fit, and an action only if it couldn't have come back before the kill (`readyAgain`). |
| brd/BurstWindow/failed-overlap | verified | `bardBuffMisaligned` | Raging Strikes, Battle Voice or Radiant Finale ending before all three overlapped | Suggestion: Medium under 3, Major at 3 or more. Checked 2026-10-16 on the 29 Bard pulls on disk: 322 buff applications, one never overlapped the other two (qjCMx4bRfgNKwX9T Dancing Mad pull 2, Battle Voice 16:08, cut by the wipe). Built 2026-10-18 from the 50 lowest Lindwurm II and The Tyrant Bards (5 had a lone buff): a buff whose window never met the other two's overlap, valued as Devilment-outside-Technical is (its share on the party's damage in the nearest overlap within 60s, minus what it added where pressed). KzamJYNWgqx3TLdw fight 27 (Reyn Ragnor): Radiant Finale 1:36, 3:38, 5:39, 7:47, each ended before Raging Strikes / Battle Voice, 173-260k each against 223k an average use added. Hy87F2VJhBqkLnt1 fight 1 (Darkrin Shade): Finale on its own 110s cooldown, 3:53, 5:46, 7:39, 9:35 (115-327k; the 2:01 one overlapped partly and the burst window judges it). None on the other 34 Bard player-pulls on disk. xivanalysis counts only a buff removed while another was up; the app judges any press with an overlap in reach. Matched 2026-10-18 on both pages: Reyn Ragnor (KzamJYNWgqx3TLdw fight 27) "14 buff applications weren't properly aligned", its Radiant Finale table at 1:35, 3:37, 5:39, 7:46 (the app's four) and no Burst Window table at all (the three never overlapped); Darkrin Shade (Hy87F2VJhBqkLnt1 fight 1) "12", listed as Finale 3:53, 5:46, 7:39, 9:35 each with the Battle Voice / Raging Strikes pair that followed 22-53s later. Its counts are the app's lone Finales plus the two buffs they missed (it lists all three; the app values the one pressed alone). Darkrin's 2:02 Finale overlapped from 2:14 (its Burst Window row, 4/8 GCDs) and is the burst window's, as in the app. |
| brd/MuseBuffWindow/per-buff-gcds | superseded | `bardBurst` | under 8 GCDs (9 with Army's Muse) in a Raging Strikes, Battle Voice or Radiant Finale window | Severity IGNORE: shows as ✗ cells, never a suggestion. The burst window carries the same count. Its Muse bonus needs only 1 GCD under Muse (the burst window needs 2; the code comment says 3). |
| brd/ArmysMuse/gcds | superseded | gap check with Army's Muse as a haste window (game.ts) | under 5 GCDs while Army's Muse is up | Severity IGNORE. The "4/5 GCDs" cells were edge GCDs; the real cost was weave delays (FRU 2:10). Not adopted, per the header. |
| brd/AlwaysBeCasting/uptime | superseded | `checkGcdGaps` | idle GCD time | Leaves Army's Paeon and Army's Muse time **out** of uptime entirely, since it can't model their speed. The app judges that time: Muse at its measured speed, Paeon at the base GCD (lenient). |
| brd/Weaving/too-many | covered | `checkGcdGaps` `gcd-clipping` | 3+ oGCDs between two GCDs | Bard GCDs are instant, so both tools use the same 2-weave limit. It fires on r4qDkR9btJCXnKWd (Pull 1 0:10, Pull 3 2:16: RF + BV + Barrage). Not yet matched against a Bard page. |
| brd/OGCDDowntime/uses | covered | `checkCooldownDrift` (tracked-cooldowns.ts "Bard") | Empyreal Arrow, Battle Voice, Radiant Finale, Raging Strikes, Barrage or Sidewinder held | Same groups, offsets and holds as xivanalysis. FRU: EA 55/59 is 3 by drift; buffs 9/10 were held for the 14:17 burst (forced). **Open:** fight 16 EA 67/69 (31.7s held) is hidden by room for uses (open-items, "cooldown room"). Raging Strikes was never reported before 2026-10-16 (no damage of its own); now `selfBuffValue` (+15%). Sample: Fz72hLDPtrv8Wq1M (fetched for this; fight 13, Valentyne Ymir, 3 of 5 used): 2 lost, 180k. Battle Voice and Radiant Finale (party buffs) still unvalued. Matched xivanalysis 2026-10-16: 3/5 = 2; its Hawk's Eye overwrites 17, the app's 18. |
| brd/DriftingEa/drift | superseded | `checkCooldownDrift` | an Empyreal Arrow pressed 2s+ after it was ready (4s more after 15s+ downtime) | A table only, no suggestion. The app sums held time and counts whole lost uses (EA hold 1ms). |
| brd/DoTs/uptime | verified | `bardDots` (`dotFindings`, `pairedIds`) | Caustic Bite or Stormbite off the target | User-confirmed on 6XaWqwMbkZG9pLmx (paired DoTs after an add dies, 1:58). |
| brd/DoTs/clipping | wrong | — | a mean of 10s+ a minute clipped (Minor), 15s Medium, 20s Major | Burst Iron Jaws snapshots count as clipping, and targets add up: 1:05 a minute on FRU, 1:06 on 2T1HzdPKgbhM43am, 37s on fight 16 (two bosses in P3). Not adopted. |
| brd/DoTs/applied-into-invuln | superseded | `bardDots` | a DoT applied shortly before the target turns invulnerable | Table only. Fight 16 3:04 and 11:46 are DoT findings in the app; 5:40 ticked to 6:15. |
| brd/RefulgentProcs/overwritten | verified | `bardOverwrites` (`procOverwrites`) | Burst Shot / Iron Jaws / Caustic Bite / Stormbite granting Hawk's Eye while one is held | Tiers: Minor 1, Medium 2, Major 3. Matched 17/17 on FRU, 15/15 on fight 16 and 4/4 on 2T1HzdPKgbhM43am. |
| brd/RefulgentProcs/dropped | verified | `checkProcs` | Hawk's Eye expiring unused | Suggestion only (the table hides drops). The app's version fires on yBKPqGwHparm7Tk4 Dancing Mad Pull 2 at 12:26 (16k; the kill, FFLogs fight 5), plus a forced one at 6:51 in boss downtime. A page for fight 2 (a 2:58 wipe, fetched 2026-10-16 to compare, then removed: it renumbers the report's baselines) matched with none dropped and 1 overwrite (Iron Jaws 2:48.7); the fight 5 page (2026-10-16) has no drop and 7 overwrites = the app's 7. Its 12:26 expiry was wrong: Refulgent Arrow was pressed at 12:11.8 (no target, the P3-P4 transition) with Hawk's Eye held and the log never recorded the removal, so the proc "ran out" at its 30s. A declared consumer that can't be pressed without the proc (`procConsumers`: Hawk's Eye → Refulgent Arrow, the Primal Rends) now counts as using it when pressed while held; only that call changed on disk. Doubt: xivanalysis also counts Shadowbite as a consumer; the app takes a second consumer only once it has 10% of the removals, so a Shadowbite in a mostly single-target pull could read as an expiry. |
| brd/MultiHitSkills/ladonsbite | verified | `bardAoe` | Ladonsbite hitting under 2 targets | 2T1HzdPKgbhM43am: both AoE matched. |
| brd/MultiHitSkills/shadowbite | verified | `bardAoe` | Shadowbite hitting under 2 targets | xivanalysis compares it with Burst Shot; the app with Refulgent Arrow, which is what Hawk's Eye would otherwise buy. Verified 2026-10-16 on Fz72hLDPtrv8Wq1M (Valentyne Ymir, found with ff-probe.js --hits): 5:41.1 on Watery Grave alone, 28k = its 1. Its Hawk's Eye overwrites list 16 times, all among the app's 18; the app's extra two (Burst Shot 0:08.94 and 0:28.91, each re-granting a held Hawk's Eye) are real in the log. |
| brd/MultiHitSkills/rain-of-death | verified | `bardAoe` | Rain of Death hitting under 2 targets | Built from fight 16 8:55/8:57 (hit only Exdeath). xivanalysis's alternative is Bloodletter; the app's is Heartbreak Shot (its upgrade). |
| brd/MultiHitSkills/quick-nock | wrong | — | Quick Nock under 2 targets | Ladonsbite replaces Quick Nock from level 82, so it can't occur at level 100. |
| brd/Death/died | covered | `checkDeaths` | a death | The generic check, verified on other jobs' case studies. |
| brd/Mitigation/defensives | no-damage | — | Nature's Minne, Troubadour and role defensives used | A use table only. |

Core modules that can't fire for Bard: Interrupts (no cast times),
Combos (no combo actions in Bard's data), Positionals, Swiftcast, Lucid
Dreaming, Overheal.

**Display only, no rule:** Coda, Repertoire and Soul Voice graphs.
Repertoire and Soul Voice draw only from `gaugeUpdate` events, which a
log has only for the player who recorded it with gauge logging. Not a
rule to audit; the app could draw Soul Voice and Repertoire lanes if a log
shows them.

## Records

| id | source | trigger / threshold | damage | log-visible | doubts |
|---|---|---|---|---|---|
| brd/BurstWindow/gcd-count | BuffWindows/BurstWindow.tsx:125-141, 343-358; core RequiredGcdCountEvaluator.tsx:27-33 | 7 required, +1 if any Army's Muse window has 2+ GCDs inside the burst window (`MIN_MUSE_GCDS`); end-of-pull windows fall back to time ÷ GCD. Minor 1, Medium 3, Major 5 missed (summed over the pull) | yes | yes | window = all three statuses; casts at the removal instant are dropped (STRICT) |
| brd/BurstWindow/barrage | BurstWindow.tsx:143-168, 439-448 | Barrage removal at or after the first Refulgent / Shadowbite, by the window's end | yes | yes | — |
| brd/BurstWindow/iron-jaws | BurstWindow.tsx:368-410 | 1 + (enemies cast on in the window − 1); an extra Iron Jaws costs nothing in `suggest` | yes | yes | enemies counted from every cast's target, oGCDs included |
| brd/BurstWindow/apex-blast | BurstWindow.tsx:170-191, 412-425 | 1 each; −1 when the window starts within 60s of the pull or the pull rushes it. Medium 1, Major 3 | yes | yes (Soul Voice gauge is not) | can't tell low Soul Voice from a held Apex |
| brd/BurstWindow/encore-resonant | BurstWindow.tsx:193-214, 427-437 | 1 each; when rushed, only Encore if any GCD landed. Medium 1, Major 2 | yes | yes | — |
| brd/BurstWindow/ea-sidewinder | BurstWindow.tsx:216-237, 360-366 | 1 each; 0 when rushed. Medium 1, Major 2 | yes | yes | — |
| brd/BurstWindow/heartbreak | BurstWindow.tsx:239-255 | 3 Heartbreak Shot / Rain of Death; 0 when rushed. Minor 1, Medium 3, Major 5 | yes | yes (charges inferred) | — |
| brd/BurstWindow/failed-overlap | core BuffGroupWindow.ts:43-61; BurstWindow.tsx:258-276, 313-319 | a buff removed while another of the three was applied but the overlap never formed. Medium under 3, Major at 3+ | yes (raid buffs multiply) | yes | fight-blind: a buff pressed alone into downtime or held for a phase counts |
| brd/MuseBuffWindow/per-buff-gcds | BuffWindows/MuseBuffWindow.tsx:42-55, 76-91 | 8 GCDs, +1 with 1+ GCD under Muse; tiers `{0: IGNORE}` | yes | yes | display only; Muse threshold differs from BurstWindow |
| brd/ArmysMuse/gcds | BuffWindows/ArmysMuse.tsx:41-53 | 5 GCDs required; tiers `{0: IGNORE}` | indirect (haste) | yes | display only |
| brd/AlwaysBeCasting/uptime | AlwaysBeCasting.ts:44-69; core AlwaysBeCasting.tsx:25, 231-237 | 98% uptime with Army's Paeon / Muse time removed from both sides | yes | yes | removes ~45s of every 2 minutes from judgment |
| brd/Weaving/too-many | core Weaving.tsx:20-31, 157-169, 203-251 | > 2 weaves after an instant GCD when the GCD gap > recast; Medium 1, Major 5 | yes | yes | ignores weaves while the boss is untargetable |
| brd/OGCDDowntime/uses | OGCDDowntime.ts:7-34; core CooldownDowntime.tsx:66-67, 223-346 | uses ÷ max uses, max from cooldown + hold (EA 1ms, RF 10s, else 1.25s) with first-use offsets (EA 4s, BV/RF 7.5s, RS 2.5s, Barrage/Sidewinder 12s); checklist target 95% | yes | yes | downtime = every enemy untargetable or the player unable to act; HP-check holds and phase holds are not downtime |
| brd/DriftingEa/drift | DriftingEa.tsx:16-20, 60-100 | each EA more than 2s after ready (+4s after 15s+ downtime) | yes | yes | table only |
| brd/DoTs/uptime | DoTs.tsx:26-43; core DoTs.tsx:136-158 | checklist, target 95% per DoT | yes | yes | averaged over every target the DoT ever touched |
| brd/DoTs/clipping | DoTs.tsx:8-15, 45-60; core DoTs.tsx:92-128, 162-181 | mean of both DoTs' clip ms per minute: Minor 10s, Medium 15s, Major 20s | yes (in principle) | yes | summed across targets; snapshot refreshes counted |
| brd/DoTs/applied-into-invuln | core DoTs.tsx:188-236 | any invulnerable time during an application | yes | yes | table only |
| brd/RefulgentProcs/overwritten | RefulgentProcs.tsx:11-38; core Procs.tsx:199-217, 572-583 | Hawk's Eye applied while held. Minor 1, Medium 2, Major 3 | yes | yes | — |
| brd/RefulgentProcs/dropped | RefulgentProcs.tsx:20, 27-31; core Procs.tsx:259-283, 322-333, 558-569 | Hawk's Eye removed with no consumer, outside death, downtime and the end of the pull. Minor 1, Medium 2, Major 3 | yes | yes | Shadowbite counts as a consumer |
| brd/MultiHitSkills/* | MultiHitSkills.ts:9-27; core AoEUsages.tsx:66-70, 100-127 | Quick Nock, Ladonsbite, Shadowbite, Rain of Death under 2 targets (successful hits). Minor 1, Medium 4, Major 7 | yes | yes | — |
| brd/Death/died | core Death.tsx:195-222 | any counted death (MORBID) | yes | yes | — |
| brd/Mitigation/defensives | Mitigation.tsx:3-8 | — (use table) | no | yes | — |

## Open

In priority order (biggest damage cost first):

1. **brd/OGCDDowntime/uses, Empyreal Arrow.** Was hidden on fight 16
   (67/69, 31.7s held): room skipped forced windows the Bard pressed it
   in. Since 2026-10-16 a forced window with a press of that cooldown
   doesn't block the room (checks.ts): fight 16 (qjCMx4bRfgNKwX9T pull 4)
   now reads 1 lost (27.7s held) against xivanalysis's 2. Across the FF
   samples it added 10 drift findings and removed none, each with at
   least a recast of unforced holds; one disagrees with xivanalysis (the
   same pull's Paladin Expiacion, 30.5s held, xivanalysis 34/34).
2. **brd/BurstWindow/failed-overlap** (verified 2026-10-18,
   `bardBuffMisaligned`): matched on both pages (see the row).
3. **brd/RefulgentProcs/dropped** (verified 2026-10-16): still needs a
   pull with Shadowbite to test the second-consumer doubt.
4. **brd/Weaving/too-many** (covered). Fires on r4qDkR9btJCXnKWd. Matched
   Hana Razzy's page (Doomtrain pull 1) 2026-10-16: 4 incorrect weaves =
   the app's four GCDs after three weaves (0:10.4 clip, 0:24.2, 0:47.0,
   1:29.1); proc overwrites 2 = 2 (Hawk's Eye 0:31.5, 0:36.4); its burst
   window's missing Iron Jaws and Sidewinder = the app's 0:10 window.
5. **brd/MultiHitSkills/shadowbite** (verified 2026-10-16, Fz72hLDPtrv8Wq1M).
