# xivanalysis audit: Viper

- **Clone:** xivanalysis `f532855e635bdfb4211cec8128d582dadfdc6a75`
  (2026-09-25). Records extracted 2026-10-15 by a Sonnet subagent (batch 2),
  spot-checked (3 of 3 matched their source); reconciled in the main session.
  Sources are relative to `src/parser/` in the clone.
- **Patch:** supported 7.05–7.5. The 7.01 / 7.05 branches (Dreadwinder →
  Vicewinder, Honed buffs) can't be reached on a supported log. The 7.05
  data layer reworked venom and coil potencies; the app values from the log.
- **App:** `lib/damage/ffxiv/jobs/melee.ts` (header, `VPR_CHECKS`: Hunter's
  Instinct `uptime`, `reawaken`, `venoms`, `rattlingCoils`,
  `serpentOfferingsCheck`, `serpentsTail`, `vprAoe`;
  `vprDisengageAlternative` in game.ts), `gauges.ts` (Rattling Coil and
  Serpent Offerings lanes), `tracked-cooldowns.ts` ("Viper"), generic
  checks. Case studies: dQ8wmb1VhKt6yBXk, 2T1HzdPKgbhM43am,
  qjCMx4bRfgNKwX9T fight 16, K6qfMamL7rN8yz2Q (three kills).
- **xivanalysis bugs found** (source-confirmed or from the extraction):
  - `FinisherProcs.tsx:67-68` sums five venoms and leaves out
    Grimhunter's Venom, which it tracks (`:43-46`): its drops and
    overwrites are never reported.
  - `FinisherProcs.tsx:60-66`, `Venoms.tsx:65-71`: the checklist splices the
    list it iterates, skipping the next proc (a skipped unused one reads
    0/0 = NaN).
  - `HonedProcs.tsx`: no empty-history guard, so NaN% when one Honed buff
    never appears.
  - `snilk.tsx`: "50 or more" left at the end is tested as `> 50`.
  - `OGCDDowntime.tsx:11` sets `displayOrder` where core reads
    `trackedDisplayOrder` (cosmetic).

## Ledger

| id | status | app check | fires-on | notes |
|---|---|---|---|---|
| vpr/Buffs/hunters-instinct-swiftscaled-uptime | verified | Hunter's Instinct `uptime` | Hunter's Instinct or Swiftscaled dropping | Checklist 95%. Red Hot: it shows 97.5% (and Swiftscaled 104.5%) by dividing by fight time less invulnerability; the log has Hunter's Instinct down 34.6s, which the app counts. Swiftscaled is a haste, judged through the gap check. |
| vpr/HonedProcs/checklist | superseded | `venoms` (Honed) | — | The checklist form of the two rules below. |
| vpr/HonedProcs/dropped | verified | `venoms` (Honed Steel / Reavers) | a Honed buff expiring or replaced | Medium 1, Major 3. 2T1HzdPKgbhM43am 3, fight 16 Honed Reavers 30/31 (7:17), The Tyrant matched. Maw consumes them too (Red Hot 3:00.1). |
| vpr/HonedProcs/overwritten | verified | `venoms` | a Honed buff granted while held | 2T1HzdPKgbhM43am 1 matched. |
| vpr/FinisherProcs/checklist | superseded | `venoms` | — | Checklist form. |
| vpr/FinisherProcs/dropped | verified | `venoms` (Hind / Flank venoms) | a finisher venom lost | Medium 1, Major 3. 2T1HzdPKgbhM43am venoms 7; The Tyrant Hindstung 8/10 matched; fight 16's Hindstung drops are Hindsbane Fangs pressed instead. Grimskin's / Grimhunter's (AoE) are left to the generic `checkProcs` (expiry only), and xivanalysis never reports Grimhunter's (bug). |
| vpr/FinisherProcs/overwritten | verified | `venoms` | a finisher venom granted while held | Same. |
| vpr/Venoms/checklist | superseded | `venoms` | — | Checklist form. |
| vpr/Venoms/dropped | covered | `venoms` (Poised) + `checkProcs` | an oGCD venom lost (Hunter's / Swiftskin's / Fellhunter's / Fellskin's Venom, Poised for Twinfang / Twinblood) | Poised drops built from Red Hot 7:06.9 (4k). The Bite venoms after a coil fall to `checkProcs`, which sees expiries only, not the wrong Bite pressed. |
| vpr/Venoms/overwritten | covered | `venoms` (Poised) | an oGCD venom granted while held | Not seen firing for the Bite venoms. |
| vpr/OGCDDowntime/uses | verified | `checkCooldownDrift` (hold 2.18s) | Serpent's Ire or Vicewinder held | Vicewinder 13/14, 13/15, 15/17 and fight 16 28/29 not adopted: each under one 40s recharge or banked while dead. |
| vpr/Positionals/missed | verified | `checkPositionals` | a missed flank / rear | Vamp 6, Red Hot 3, fight 16 8 matched. The Tyrant's Hindsbane misses were never caught until the app's name lookup was fixed (xivanalysis's data spells it "Hindbane"). |
| vpr/AoEChecker/too-few-targets | verified | `vprAoe` (minimum 3) | Steel / Reaving Maw or another AoE on under 3 targets | Red Hot 3:00.1 Reaving Maw on one target (16k) built. |
| vpr/RattlingCoil/leftover | verified | `rattlingCoils` (gauge, held at the kill) | coils left at the end | Minor 1, Medium 2. Red Hot 3, fight 16 1, The Tyrant 1, Vamp 1 matched; the app judges how long it was held. |
| vpr/RattlingCoil/overcap | verified | `rattlingCoils` | a coil gained at 3 | The Tyrant 6:10.7 and 10:11.9 matched. |
| vpr/RattlingCoil/checklist-uncoiled-fury | superseded | `rattlingCoils` | — | Vamp 15/18 was coils lost at the death plus one at the kill. |
| vpr/Reawaken/expected-groups-generations | verified | `reawaken` | under 4 Generations in Reawaken | Minor 1, Medium 3, Major 5 (shared). 2T1HzdPKgbhM43am 6:05, fight 16 6:06 matched. A window running past the kill is skipped (fight 16 18:27). |
| vpr/Reawaken/expected-groups-legacies | verified | `reawaken` | under 4 Legacies | Fight 16 Third Legacy 24/25 (0:55) matched. |
| vpr/Reawaken/expected-groups-ouroboros | verified | `reawaken` | no Ouroboros | — |
| vpr/Reawaken/generations-in-order | no-damage | — | Generations out of order | A note column; out-of-order Generations aren't possible in-game except across a broken window. |
| vpr/SerpentsIre/expected-actions | wrong | — | under 2 Reawakens / 2 Ouroboros in the 30s after Serpent's Ire | Medium 1, Major 2. Fight 16's "8 missed": the first Reawaken pressed one GCD before Serpent's Ire, both inside the buffs; others cut by HP checks or the kill. No end-of-pull or downtime allowance. |
| vpr/Tincture/expected-actions | superseded | tincture.ts | 2 Reawakens / 2 Ouroboros under the tincture | Vamp 6:06, The Tyrant 4:10 followed deaths; Red Hot 6:39 lost Ouroboros to the split-arena Inferno. |
| vpr/Tincture/window-table | no-damage | — | — | Table only. |
| vpr/SerpentsTail/checklist | covered | `serpentsTail` (+ `reawaken` for Legacies) | Death Rattle / Last Lash not pressed after a finisher, or a Legacy skipped | Built 2026-10-16: lost when the next GCD comes first (press order); her average; forced, movement or death between shown, not counted. On disk 15 of 2,220 finishers, no Last Lash; 4 counted (yBKPqGwHparm7Tk4 Dancing Mad pull 2 10:47 and 17:08, cZ42C1y3JRNGXWLH 9:18, zPJaZNfkFAKhY42t 6:50; ~30k each), 8 shown. FFLogs top 20: 9 of 596 lost, 2 at the 1:47 downtime. Matched xivanalysis's 1 on 2T1HzdPKgbhM43am fight 10 (13:28, fetched back 2026-10-16). |
| vpr/Vices/checklist | candidate | — | a coil or Bite missing after Vicewinder / Vicepit | Checklist 100%. The app checks the Poised buffs after a coil, not a coil skipped after Vicewinder. Rare. |
| vpr/snilk/overcap | covered | `serpentOfferingsCheck` (and the Offerings lane, now the same simulation) | Serpent Offerings over 100 | Built 2026-10-16: each Offering is a fiftieth of her Reawaken (Reawaken, Generations and Ouroboros over the GCDs they replace, plus Legacies). K6qfMamL7rN8yz2Q Vamp Fatale 20 over (3:26, 3:29, 7:18), xivanalysis's 20. 37 on disk across 12 pulls; cBZXM6kayd7Tf9Fg Red Hot and Deep Blue 12 (6 paid Reawakens in 9:36). |
| vpr/snilk/lost-reawaken-at-end | covered | `serpentOfferingsCheck` | 50+ Offerings or Ready to Reawaken held at the end | Built 2026-10-16, kills only: from the later of reaching it and the last Reawaken's end, counted when six ordinary GCDs (a Reawaken's worth) went by. 4 counted (CABrk9zXLfJG8h6R Lindwurm pull 2, cBZXM6kayd7Tf9Fg, jXG76ba43VDLAvYz, pnLBzfbH8NjGAJRg Enuo pull 12; 380-520k), 6 shown (0-4 GCDs left: pooled for the last Serpent's Ire, or the Limit Break). xivanalysis has no time allowance. |
| vpr/Weaving/too-many-weaves | verified | `checkGcdGaps` | triple weaves (+1 allowed after Uncoiled Fury) | Red Hot 4 matched. The Tyrant 7:25 (0.3s, with Feint) is under the 0.5s floor. |
| vpr/Combos/broken | verified | `checkCombos` | a broken or timed-out combo | Fight 16 16:02, Red Hot 6:39, The Tyrant 5:40 matched. |
| vpr/AlwaysBeCasting/uptime | superseded | `checkGcdGaps` (Swiftscaled as haste) | idle GCD time | Downtimes match by time on three kills. |
| vpr/Snaps/writhing-snap-count | verified | `checkDisengages` + `vprDisengageAlternative` | Writhing Snap pressed | A statistic in xivanalysis. The app judges each, and a Snap with an unpooled coil held is a choice (Red Hot 8:15.7, 34k; The Tyrant 6:29-6:31, 136k). |
| vpr/Death/died | verified | `checkDeaths` | a death | Vamp 5:30, The Tyrant 3:49.8 matched. |

Core modules that can't fire for Viper: DoTs (Noxious Gnash removed in
7.05), Interrupts, Swiftcast, Lucid, Overheal.

## Records

| id | source | trigger / threshold | damage | log-visible | doubts |
|---|---|---|---|---|---|
| vpr/Buffs/* | vpr/modules/Buffs.tsx:28-51 | uptime ÷ (pull − invulnerable): checklist 95% | yes | yes | can exceed 100% |
| vpr/HonedProcs/* | vpr/modules/HonedProcs.tsx:11-98 | dropped: Medium 1, Major 3; overwritten: Minor 1, Medium 3, Major 5; checklist 95% | yes | yes | NaN when one buff never appears |
| vpr/FinisherProcs/* | vpr/modules/FinisherProcs.tsx:11-97 | same tiers; six venoms tracked, five summed | yes | yes | Grimhunter's omitted; splice bug |
| vpr/Venoms/* | vpr/modules/Venoms.tsx:10-97 | six oGCD procs: core tiers Minor 1, Medium 2, Major 3 | yes | yes | splice bug |
| vpr/OGCDDowntime/uses | vpr/modules/OGCDDowntime.tsx:4-33 | Serpent's Ire; Vicewinder / Vicepit (charges); hold 2.18s; checklist 95% | yes | yes | — |
| vpr/Positionals/missed | vpr/modules/Positionals.tsx:4-13 | six positional actions (checklist) | yes | yes (bonusPercent) | — |
| vpr/AoEChecker/too-few-targets | vpr/modules/AoEChecker.tsx:6-29 | three AoE pairs under 3: Minor 1, Medium 4, Major 7 | yes | yes | — |
| vpr/RattlingCoil/* | vpr/modules/RattlingCoil.tsx:14-142 | leftover / overcap: Minor 1, Medium 2; checklist spent ÷ generated | yes | no (inferred, starts at 0) | — |
| vpr/Reawaken/* | vpr/modules/Reawaken.tsx:14-158 | 4 Generations, 4 Legacies, 1 Ouroboros per window; 0 in the last 30s: Minor 1, Medium 3, Major 5 | yes | yes | any Reawaken in the last 30s is excused whole |
| vpr/SerpentsIre/expected-actions | vpr/modules/SerpentsIre.tsx:10-60 | 2 Reawaken + 2 Ouroboros in 30s (1 each in the opener): Medium 1, Major 2 | yes | yes | no rush / downtime allowance |
| vpr/Tincture/expected-actions | vpr/modules/Tincture.tsx:9-57 | 2 Reawaken + 2 Ouroboros: Medium 1, Major 2 | yes | yes | Medicated has no duration in data |
| vpr/SerpentsTail/checklist | vpr/modules/SerpentsTail.tsx:12-151 | follow-ups pressed ÷ ready: checklist 100% | yes | yes | counts presses, not timing |
| vpr/Vices/checklist | vpr/modules/Vices.tsx:12-155 | coils / bites pressed ÷ ready: checklist 100% | yes | yes | double counts with Venoms |
| vpr/snilk/* | vpr/modules/snilk.tsx:15-113 | overcap: Medium 25, Major 50; > 50 or Ready to Reawaken at the end: Major | yes | no (inferred) | `> 50` vs "50 or more" |
| vpr/Weaving/too-many-weaves | vpr/modules/Weaving.ts:3-12 | core rule, +1 after Uncoiled Fury: Medium 1, Major 5 | yes | yes | Swiftscaled Generations drop the limit to 1 |
| vpr/Snaps/writhing-snap-count | vpr/modules/Snaps.tsx:11-45 | statistic | — | yes | — |

## Open

In priority order (biggest damage cost first):

1. **vpr/snilk/lost-reawaken-at-end** (covered 2026-10-16): needs a
   xivanalysis page for a counted one (cBZXM6kayd7Tf9Fg, jXG76ba43VDLAvYz).
2. **vpr/SerpentsTail/checklist**: verified on one page (2T1HzdPKgbhM43am);
   Last Lash never seen.
3. **vpr/Venoms/dropped, the Bite venoms** (covered). A wrong Bite after a
   coil isn't seen; add the four venoms to `VENOM_PROCS` once one turns up.
4. **vpr/Vices/checklist** (candidate, rare): 22 of 1,043 Vicewinders /
   Vicepits on disk without both coils, most at a death or a wipe's end
   (cZ42C1y3JRNGXWLH 0:49: two Uncoiled Furies, then the combo, coils
   never pressed). Needs the rule for when a coil stops being available.
