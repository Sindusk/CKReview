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
| gnb/Ammo/combo-overcap | covered | `cartridges` (gaugeFindings) | Solid Barrel / Demon Slaughter at 3 cartridges | Not matched against a page (fight 16 had none). |
| gnb/Ammo/bloodfest-expire-drop | covered | `cartridges` (cap 6, loss over 3 at the end) | Bloodfest ending with more than 3 cartridges | 7.4+ only. Not seen firing. |
| gnb/Ammo/cartridge-usage-checklist | superseded | `cartridges` | cartridges generated but not spent | The same loss as the overcap and leftover rules. |
| gnb/Continuation/dropped | covered | `checkProcs` | Ready to Rip / Tear / Gouge / Blast / Raze expiring | Fight 16: 100%, so never seen firing. |
| gnb/Continuation/usage-checklist | superseded | `checkProcs` | — | The checklist form of the same rule (it also splices its list while iterating). |
| gnb/SonicBreak/missing-ticks | candidate | — | a Sonic Break whose DoT stopped early (target died or turned untargetable) | Minor 1, Medium 5, Major 10 ticks. The app has no Gunbreaker DoT check; `dotFindings` could value the re-application. Premise check: most short Sonic Breaks are the target leaving. |
| gnb/AoE/demon-slice | covered | `aoeCombo` | Demon Slice on one target | Fires on yPHmaGTY2btq1wD9 Red Hot and Deep Blue 3:57 and 4:04 (Demon Slice, Demon Slaughter on one boss with the two apart; 16k, 19k). |
| gnb/AoE/fated-circle | covered | `aoeCombo` (vs Burst Strike) | Fated Circle on one target | Built 2026-10-15. Premise holds (same cartridge). Fires on L9BzKkD2nxcVgHTC Necron pulls 7-21 and pG319BgHTnPJc6Ft Necron pulls 1-3 (one Gunbreaker spending the opener's Bloodfest cartridges on Necron alone, e.g. pull 14 0:11, 0:14, 0:17; and single Hands in the adds, pull 18 3:35, 3:53), 0-34k each. A pull with no Burst Strike has no average to compare against and stays silent (L9BzKkD2nxcVgHTC pull 10). Fight 16 8:09's two hit both P3 bosses (right). No xivanalysis page for these pulls. |
| gnb/Cooldowns/uses | verified | `checkCooldownDrift` | Gnashing Fang, Blasting Zone, No Mercy, Bow Shock, Double Down or Bloodfest held | Fight 16: Gnashing Fang 37/38 and Sonic Break 18/19 were downtime (forced). |
| gnb/Cooldowns/bloodfest-hold | covered | `checkCooldownDrift` (Bloodfest hold 0) | Bloodfest held | **Patch gap:** before 7.4 xivanalysis allows 10s of hold (Bloodfest waits for No Mercy); the app allows 0 on every patch. |
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

1. **gnb/SonicBreak/missing-ticks** (candidate). Premise check first.
2. **gnb/Cooldowns/bloodfest-hold, pre-7.4.** Gate the hold allowance on
   patch once a 7.0-7.3 Gunbreaker pull is on disk.
3. **gnb/Ammo/combo-overcap, bloodfest-expire-drop; gnb/Continuation/
   dropped** (covered). None seen firing.
