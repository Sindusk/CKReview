# xivanalysis audit: Gunbreaker

- **Clone:** xivanalysis `f532855e635bdfb4211cec8128d582dadfdc6a75`
  (2026-09-25). Records extracted 2026-10-15 by a Sonnet subagent (batch 1),
  spot-checked (3 of 3 matched their source); reconciled in the main session.
  Sources are relative to `src/parser/` in the clone.
- **Patch:** `Ammo.tsx` (Double Down costs 2 before 7.1 and after 7.3;
  Bloodfest's 6-cartridge status from 7.4), `Cooldowns.tsx` (Bloodfest may
  be held 10s before 7.4, 0 from 7.4), `NoMercy.tsx` (Lion Heart's
  expectation; a Bloodfest note column before 7.3), `SonicBreak.tsx` (10
  ticks before 7.4, 5 from 7.4). Supported 7.0–7.5.
- **App:** `lib/damage/ffxiv/jobs/gnb.ts` (header, `GNB_CHECKS`: `noMercy`,
  `cartridges`, `aoeCombo`), `tracked-cooldowns.ts` ("Gunbreaker"),
  generic checks. The app encodes 7.4 rules only. Case studies:
  qjCMx4bRfgNKwX9T fight 16, RmCphLTDaMXyAf2r.
- **xivanalysis bugs found** (source-confirmed):
  - `NoMercy.tsx:26, 192` compares `getDuration()` (ms, ~2500) with
    `GCD_SLOW = 2.47`, so it always expects Gnashing Fang in No Mercy.
  - `Cooldowns.tsx:57` spells `firseUseOffset`, so Sonic Break's 12.5s
    offset is ignored.

## Ledger

| id | status | app check | fires-on | notes |
|---|---|---|---|---|
| gnb/NoMercy/gcd-count | verified | `noMercy` expectedGcds | No Mercy under 9 GCDs (8 at 2.47s+) | Fight 16's 7 matched with its 2.47s; the app reads the 2.45s tier (`gcdTierMs`), so 10:11, 15:14, 16:15 count (settled with RmCphLTDaMXyAf2r). |
| gnb/NoMercy/expected-actions | verified | `noMercy` expected | Savage Claw, Wicked Talon, Double Down, Sonic Break, Blasting Zone, Bow Shock or Lion Heart missing | Fight 16's 13 matched. 5:06's Double Down was 0.1s before No Mercy (multiplier 1.01). |
| gnb/NoMercy/gnashing-fang-adjust | wrong | `noMercy` (the intended rule) | Gnashing Fang missing from No Mercy | xivanalysis's unit bug makes it always expected. The app expects it only when the GCD is slow or it was used inside. |
| gnb/NoMercy/lion-heart-adjust | verified | `noMercy` | Lion Heart missing | 7.4+: always expected; before 7.4: only with Bloodfest in the window. The app uses the 7.4 rule on every patch. |
| gnb/NoMercy/rushed-window-adjust | superseded | burst window cut short by the kill | a window the kill cuts short | xivanalysis subtracts 1 from each; the app keeps what could still fit (`readyAgain`). |
| gnb/NoMercy/bloodfest-used-notes | no-damage | — | — | A note column before 7.3. |
| gnb/Ammo/leftover-cartridges | verified | `cartridges` (`leftAtKill`) | cartridges left at the kill | Fight 16's 1 built from it. No end-of-pull allowance in xivanalysis (wipes count too); the app judges how long it was held. |
| gnb/Ammo/combo-overcap | verified | `cartridges` (gaugeFindings) | Solid Barrel / Demon Slaughter at 3 cartridges | Matched xivanalysis 2026-10-16 on Xk2DKZwVp4Ar6d7y Enuo pull 10 (Solarus Thalan): 2 = 2 (4:40.2, 5:26.0). |
| gnb/Ammo/bloodfest-expire-drop | verified | `cartridges` (cap 6, loss over 3 at the end) | Bloodfest ending with more than 3 cartridges | 7.4+ only. Matched xivanalysis 2026-10-16 on Xk2DKZwVp4Ar6d7y Enuo pull 10: 1 = 1 (1:37.9). |
| gnb/Ammo/cartridge-usage-checklist | superseded | `cartridges` | cartridges generated but not spent | The same loss as the overcap and leftover rules. |
| gnb/Continuation/dropped | verified | `checkProcs` (`procsClearedByGcd`) | Ready to Rip / Tear / Gouge / Blast / Raze cleared by another GCD | Fight 16: 100%, and 0 in the app. The check never fired anywhere: it only looked for procs reaching their expiry, and the next weaponskill clears these first. Fixed 2026-10-16: a removal at another cast with no consumer beside it (or pressed while held) is the loss, the consumer's average. Sample: Mg4p7XG9dtrLVwBf (fetched for this; fight 2, Momo First, a 0.1-percentile Red Hot and Deep Blue parse found with scripts/ff-rankings.js and ff-probe.js): 14 (Ready to Raze cleared by Demon Slice ×9, Rip ×3, Blast ×2; one Ready to Gouge has no Eye Gouge average to value it). On disk ~40 more, each checked one a genuine drop (pG319BgHTnPJc6Ft Necron pull 3 0:39.9, Savage Claw with no Jugular Rip; bVDR2mTL7YGvMxK1 Vamp 0:09.3, Double Down). Matched xivanalysis 2026-10-16 on Mg4p7XG9dtrLVwBf: its 15 (Rip 3, Gouge 1, Blast 2, Raze 10) = the app's Rip 3, Blast 2, Raze 10 once overwrites counted (Fated Circle 3:44.91 re-applied Ready to Raze held from 3:42.50; a re-application while held now counts as lost); its Ready to Gouge has no Eye Gouge average (never pressed) so shows nothing. 14 of 15. |
| gnb/Continuation/usage-checklist | superseded | `checkProcs` | — | The checklist form of the same rule (it also splices its list while iterating). |
| gnb/SonicBreak/missing-ticks | wrong | — | a Sonic Break whose DoT stopped early (target died or turned untargetable) | Minor 1, Medium 5, Major 10 ticks. The app has no Gunbreaker DoT check; `dotFindings` could value the re-application. Premise check: most short Sonic Breaks are the target leaving. Checked 2026-10-16 on 141 Gunbreaker pulls: a 15s Sonic Break ticks 5 times (453 of them; the 177 with 10 are two targets). The 21 with under 4 ticks sit at the same fight moments across pulls (Necron 3:13-3:21 and 4:42-5:51, Enuo 2:24-2:35, Doomtrain 2:24-2:28, Zelenia 2:13-2:19): the target leaving inside No Mercy, which the player can't hold through. Not adopted. |
| gnb/AoE/demon-slice | verified | `aoeCombo` | Demon Slice on one target | Fires on yPHmaGTY2btq1wD9 Red Hot and Deep Blue 3:57 and 4:04 (Demon Slice, Demon Slaughter on one boss with the two apart; 16k, 19k). Matched xivanalysis on L9BzKkD2nxcVgHTC Necron pull 15 (1 of its 1; the app also flags a Demon Slaughter, which xivanalysis doesn't track). |
| gnb/AoE/fated-circle | verified | `aoeCombo` (vs Burst Strike) | Fated Circle on one target | Built 2026-10-15. Premise holds (same cartridge). Fires on L9BzKkD2nxcVgHTC Necron pulls 7-21 and pG319BgHTnPJc6Ft Necron pulls 1-3 (one Gunbreaker spending the opener's Bloodfest cartridges on Necron alone, e.g. pull 14 0:11, 0:14, 0:17; and single Hands in the adds, pull 18 3:35, 3:53), 0-34k each. A pull with no Burst Strike has no average to compare against and stays silent (L9BzKkD2nxcVgHTC pull 10). Fight 16 8:09's two hit both P3 bosses (right). Matched xivanalysis on L9BzKkD2nxcVgHTC Necron pull 15: 4 of 4. The raw comparison found only 2: the opener's two (0:05, 0:18) dealt 25-26k in the burst, level with Burst Strike's 25k pull average. The buff-neutral comparison (2026-10-15) prices them at 9-11k each, a Fated Circle being 0.63 of a Burst Strike (300 against 460 potency). |
| gnb/Cooldowns/uses | verified | `checkCooldownDrift` | Gnashing Fang, Blasting Zone, No Mercy, Bow Shock, Double Down or Bloodfest held | Fight 16: Gnashing Fang 37/38 and Sonic Break 18/19 were downtime (forced). |
| gnb/Cooldowns/bloodfest-hold | verified | `checkCooldownDrift` (Bloodfest hold 0; 10s and a 120s recast on 7.0-7.3 via `holdMsOnPatches` / `recastOnPatches`; valued by `bloodfestValue`, 2026-10-16) | Bloodfest held | As xivanalysis: before 7.4 Bloodfest waits for No Mercy. Valued as the Reign of Beasts combo + 1.5 × (Burst Strike + Hypervelocity) − 4.5 combo GCDs (the 6 freed GCDs go to the combo, whose Solid Barrels give 1.5 cartridges back). Found while building it: the vendored 7.4 data gave Bloodfest a 60s recast on every patch (120s before 7.4), which read the 7.2 Zelenia kills as 3 uses lost; Gnashing Fang likewise has 1 charge before 7.4 (and BLM's Ley Lines before 7.1), now per patch. Fires on 7.5 kills, ~1 use (Xk2DKZwVp4Ar6d7y Enuo pull 10 4:09-4:41, 224k; Red Hot and Deep Blue kills 153-180k) and the 7.3 Necron wipes. Matched xivanalysis 2026-10-16 on Enuo pull 10: Bloodfest 9 / 10, the app's 1 lost; its combo breaks (5) matched too. |
| gnb/Tincture/expected-actions | superseded | tincture.ts | Gnashing Fang ×2 and the burst actions under the tincture | Fight 16's 4: one Gnashing Fang of two each, ~3% of a GF combo. |
| gnb/Combos/broken | covered | `checkCombos` | a broken combo | Generic. |
| gnb/Weaving/too-many | verified | `checkGcdGaps` | triple weaves | Fight 16: 6:03, 8:07, 11:08 matched; most of its 13 are 0.02-0.2s jitter or a defensive with Bloodfest + No Mercy. |
| gnb/Disengage (Lightning Shot) | verified | `checkDisengages` | Lightning Shot pressed | Fight 16: its 9 are the app's 9 (6 unforced). |
| gnb/AlwaysBeCasting/uptime | superseded | `checkGcdGaps` | idle GCD time | — |
| gnb/Death/died | covered | `checkDeaths` | a death | Generic. |

## Records

| id | source | trigger / threshold | damage | log-visible | doubts |
|---|---|---|---|---|---|
| gnb/NoMercy/gcd-count | gnb/modules/NoMercy.tsx:12-40, 66-73, 105-121 | min(9, ⌈(len − 250ms) ÷ GCD⌉): Minor 1, Medium 2, Major 4 | yes | yes | — |
| gnb/NoMercy/expected-actions | NoMercy.tsx:12-40, 123-217 | the burst actions once each (GF and Lion Heart by adjustment): Minor 1, Medium 4, Major 8 | yes | yes | GF unit bug; Lion Heart patch-gated |
| gnb/Ammo/leftover-cartridges | gnb/modules/Ammo.tsx:32-35, 274-284 | cartridges at the end: Minor 1, Medium 2 | yes | no (inferred) | wipes count |
| gnb/Ammo/combo-overcap | Ammo.tsx:37-41, 158-193, 298-325 | cartridge gains over the cap: Medium 1, Major 3 | yes | no (inferred) | — |
| gnb/Ammo/bloodfest-expire-drop | Ammo.tsx:37-41, 97-156, 285-296 | Bloodfest removed holding > 3: Medium 1, Major 3 (7.4+) | yes | no (inferred) | the kill counts |
| gnb/Ammo/cartridge-usage-checklist | Ammo.tsx:326-342 | spent ÷ generated | yes | no | — |
| gnb/Continuation/* | gnb/modules/Continuation.tsx:10-70 | Continuation procs dropped: Minor 1, Medium 2, Major 3; checklist of uses | yes | yes | splices while iterating |
| gnb/SonicBreak/missing-ticks | gnb/modules/SonicBreak.tsx:16-131 | ticks under 10 (before 7.4) / 5 (7.4+): Minor 1, Medium 5, Major 10 | yes | yes | not per target |
| gnb/AoE/* | gnb/modules/AoE.ts:6-36 | Demon Slice, Fated Circle under 2: Minor 1, Medium 4, Major 7 | yes | yes | — |
| gnb/Cooldowns/* | gnb/modules/Cooldowns.tsx:28-72 | GF, Blasting Zone, No Mercy, Bow Shock, Double Down, Sonic Break, Bloodfest (hold 10s before 7.4); checklist 95% | yes | yes | Sonic Break offset typo |
| gnb/Tincture/expected-actions | gnb/modules/Tincture.tsx:7-50 | Sonic Break 1, GF 2, Double Down 1, Lion Heart 1, Bow Shock 1, Blasting Zone 1: Minor 1, Medium 2, Major 3 | yes | yes | — |

## Open

In priority order (biggest damage cost first):

1. **gnb/Continuation/dropped** (verified 2026-10-16, 14 of 15 on
   Mg4p7XG9dtrLVwBf; the 15th needs a value for a never-pressed
   consumer). (Bloodfest drift and both cartridge rows matched a page
   2026-10-16.)
