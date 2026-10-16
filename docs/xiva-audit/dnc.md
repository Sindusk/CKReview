# xivanalysis audit: Dancer

- **Clone:** xivanalysis `f532855e635bdfb4211cec8128d582dadfdc6a75`
  (2026-09-25). Records extracted 2026-10-15 by a Sonnet subagent (batch 1),
  spot-checked (3 of 3 matched their source); reconciled in the main session.
  Sources are relative to `src/parser/` in the clone.
- **Patch:** no patch branches in `jobs/dnc`; supported 7.0–7.5. The gauge
  code switches on whether the log has `gaugeUpdate` events, not on patch.
- **App:** `lib/damage/ffxiv/jobs/ranged.ts` (header, `DNC_CHECKS`:
  `technical`, `technicalFillers`, `dancerOverwrites`,
  `dancerGaugeEstimates` + `unpooledFeathers`, `dancerAoe`), `gauges.ts` (Feathers,
  Esprit), `tracked-cooldowns.ts` ("Dancer"), generic checks in
  `lib/damage/checks.ts`. Case studies: jN3XDrf2z8PmLgRJ Vamp pull 8,
  dQ8wmb1VhKt6yBXk, qjCMx4bRfgNKwX9T kill, K6qfMamL7rN8yz2Q (Vamp Fatale,
  Red Hot and Deep Blue, The Tyrant).

## Ledger

| id | status | app check | fires-on | notes |
|---|---|---|---|---|
| dnc/Technicalities/gcd-count | verified | `technical` expectedGcds 8 | a Technical Finish window under 8 GCDs | Every window matched on K6qfMamL7rN8yz2Q (three kills). xivanalysis counts boss downtime and death inside the window; the app marks it forced. |
| dnc/Technicalities/expected-actions | verified | `technical` expected | Dawn, Finishing Move, Starfall, Tillana, 4 Last/Saber Dances or Fan Dance IV missing | The one-fewer-Saber allowance with no filler was ported (`sabersExpected`). qjCMx4bRfgNKwX9T 2/4 and 2/3 windows match. |
| dnc/Technicalities/bad-gcds | verified | `technicalFillers` | Cascade, Fountain, Reverse Cascade, Windmill, Rising Windmill or Bladeshower in the window | Same list (Fountainfall and Bloodshower allowed). A filler in a missing Saber's slot is charged once. |
| dnc/Technicalities/pooled-feathers | verified | `unpooledFeathers` (named, not valued) | under 3 Fan Dances in a window after feathers were spent between windows | K6qfMamL7rN8yz2Q Vamp 6:09 matched. Rests on the estimated feather gauge. |
| dnc/Technicalities/timely-devilment | wrong | — | Devilment not the first action in the window | The advice holds: Technical Finish leaves one weave slot, and Devilment belongs in it. The check is wrong as a damage charge: it fires without asking whether any GCD missed Devilment. A Devilment 0.67s late still covered every GCD (dps-analysis.md): jN3XDrf2z8PmLgRJ Vamp pull 8 (fight 8) 8:21, Shield Samba woven first, Devilment second, Starfall Dance 2.0s after the finish (a ~0.5s clip, which is the real cost). The late Devilment at qjCMx4bRfgNKwX9T fight 1 (the first of its two kills; Dancer actor 17) 14:07 was in forced time: Tillana went first, and the P4 window ends at 14:18.9 with nothing cast until 14:43. |
| dnc/Technicalities/bad-devilments | verified | `devilmentMisaligned` | Devilment pressed with no Technical Finish up | Built 2026-10-16. Premise check on all 442 Dancer pulls on disk (1178 Devilments): 12 were pressed under 2.5s before the Technical Finish status landed (xivanalysis counts those; the app allows them). Two had no Technical Finish to go with: CABrk9zXLfJG8h6R Lindwurm II pull 1 (a 20s wipe) and cZ42C1y3JRNGXWLH 8:58 (the 8:34 Technical Step was never finished). One is real: zPJaZNfkFAKhY42t 6:23, 21s before the 6:43 Technical Finish, 185k: Devilment's crit and direct-hit gain on the Dancer's and partner's damage in the window minus in the 20s it covered (crit and DH taken out, damage buffs kept). Matched xivanalysis 2026-10-16 (Twizzy Iana: "1 Devilment used outside Technical Finish"). |
| dnc/Technicalities/late-standard | superseded | `technical` | Standard Step as the last action of a window | Only Standard Step, the dance's start, so the finish may land after the buff. Finishing Move as the last GCD isn't checked, nor the Last Dance it then pushes out of the window: the real cost of a late Standard, raised by a Dancer (2026-10-15). The window's GCD and Last/Saber counts carry both. The window ignores autos, the four steps and Technical Finishes (Technicalities.tsx `ignoreActions`; CommonData.tsx `DANCE_MOVES`), but not the Standard Finishes. So a finish inside the buff becomes the last action and passes: it fails only when the Step was pressed in the buff and the finish landed after it. Never fired on qjCMx4bRfgNKwX9T fight 1: no window ends on Standard Step. Three end on Finishing Move (0:21, 2:21, 14:18). At 14:18 the P4 window is 6 of 8 GCDs (xivanalysis's gcd-count) and its Last Dance waits until 14:49, in forced time. |
| dnc/Technicalities/players-buffed | covered | buffs.ts coverage | a Technical Finish that missed a player | Display only in xivanalysis. |
| dnc/Technicalities/raid-buff-overwrite | no-damage | — | two Dancers' Technical Finishes overlapping | A note column; no single-Dancer static hits it. |
| dnc/DirtyDancing/correct-finish | verified | `dancerDances` | a dance finished with fewer steps than Double Standard / Quadruple Technical | Built 2026-10-15; one finding per short finish, so the zero-step rules aren't counted twice. Valued as the buff gap on the recipients' hits (percentages measured from hit multipliers: Technical 1/2/3/5%, Standard 0/2/5%) plus the finisher's own lower damage, buff-neutral. Found by searching the 71 lowest Red Hot and Deep Blue Dancer parses (18 had a dance mistake). Fires on 9zQqtBRL41XhADxG 9:06 and at2GMBcywChApnfY 4:21 (Triple Technical after moving mid-dance; 96k, 161k), Jv7XZL2zwYgyhdFj 7:14 and 8:51 (Single Standard; 129k, 180k), and on older samples (JZ1KXhDbqkNH3jxR, r83YhVvDwpzBkLyF, rFQT8XZckzvH1LNx, pG319BgHTnPJc6Ft). Premise holds on each: none was near downtime or the kill. The 0-step Standard Finish at qjCMx4bRfgNKwX9T 11:50 was in forced time. Matched xivanalysis on all five pulls (2026-10-15): 9zQqtBRL41XhADxG 1, at2GMBcywChApnfY 1, MFGhwLnJ34pz7cWQ 1, Jv7XZL2zwYgyhdFj 2, zPJaZNfkFAKhY42t 0. xivanalysis also counts a zero-step finish as "missing steps"; the app makes it one finding. |
| dnc/DirtyDancing/zero-step-standard | verified | `dancerDances` | Standard Finish with no steps | Fires on MFGhwLnJ34pz7cWQ 7:45 (Standard Step, Finish 1.5s later; 120k: the old buff ran on, so most of it is the finisher's own 0-step damage) and r83YhVvDwpzBkLyF Queen Eternal pull 12 5:59 (both steps wrong). Matched xivanalysis on MFGhwLnJ34pz7cWQ (1, Medium). |
| dnc/DirtyDancing/zero-step-technical | verified | `dancerDances` | Technical Finish with no steps | Fires on ZVCqpA8DPJgMK2Yr 6:47 (472k: no party buff for 20s in the burst, 285k, plus a 0-step finisher). Matched xivanalysis 2026-10-16 (Kira Cruz: 1 Technical Step with no dance steps). |
| dnc/DirtyDancing/no-extra-moves | verified | `dancerDances` | a wrong step pressed in a dance | Presses beyond the finisher's step count, each a 1s step GCD at her average GCD (11-32k). Fires on zPJaZNfkFAKhY42t 2:07, 6:35, 8:00, at2GMBcywChApnfY 5:15, Jv7XZL2zwYgyhdFj 7:14, 8:16, 9zQqtBRL41XhADxG 9:06 (4 presses, one wrong, so the press count alone hides it), and Chauzey Solstice on several statics' pulls. Matched xivanalysis on at2GMBcywChApnfY (1), Jv7XZL2zwYgyhdFj (2), zPJaZNfkFAKhY42t (3). Not matched by design: 9zQqtBRL41XhADxG 9:06, where xivanalysis counts a wrong step only when presses exceed the dance's full step count (4 presses for a Technical isn't over 4); one of the 4 didn't count toward the 3-step finish, so it was still a wasted 1s step GCD. |
| dnc/DirtyDancing/hit-target | covered | `noDamageCasts` | a finish that hit nothing | The app values the finish's own damage, not the buff that wasn't given. Seen 2026-10-16 on JTADq4kz8PRfF1hN (fetched for this; Vamp Fatale fight 20, Chimi Doll, found with ff-probe.js --hits): Double Standard Finish 1:07.7, no damage logged, 88k, shown as forced: FFLogs previewed the hit and it never landed (Vamp Fatale turning untargetable as the Coffinmakers come at ~1:10). xivanalysis's page marks that dance "Hit Target ✓" (its fault there is an extra step), so it agrees the miss wasn't hers. (ff-probe.js shows Technical Finish as x0 everywhere: its damage logs under a second id.) |
| dnc/DirtyDancing/standard-finish-uptime | superseded | `checkCooldownDrift` (Standard Step) | Standard Finish lapsing | Re-dancing on time is the Standard Step drift. Sums over every friend and subtracts downtime from both sides. |
| dnc/DirtyDancing/closed-position-uptime | candidate | — | no dance partner, or Closed Position dropped | Losing a partner costs their Standard Finish and Devilment. Not built (2026-10-16): on 442 Dancer pulls every Dancer had a partner from the pull, and each of the 26 drops was re-applied within 2s (a partner swap). Build it when a pull shows a real gap. |
| dnc/Procs/dropped | verified | `checkProcs` | a proc left to expire | K6qfMamL7rN8yz2Q matched: Silken Flow 4:29 and 8:30.8, Silken Symmetry 8:30. jN3XDrf2z8PmLgRJ pull 8 Symmetry matched. |
| dnc/Procs/overwritten | verified | `dancerOverwrites` | a proc granted while held | Matched on jN3XDrf2z8PmLgRJ pull 8, qjCMx4bRfgNKwX9T 15:59, K6qfMamL7rN8yz2Q 8:49. The app tracks 6 of xivanalysis's 8. Flourishing Starfall and Flourishing Finish can't be overwritten: they come from Devilment and Technical Finish (120s cooldowns) and last 20s / 30s. 0 "refreshed" in 442 Dancer pulls (2026-10-16), so they stay out. |
| dnc/Gauge/esprit-overcap | verified | `dancerGaugeEstimates` (named, not valued) | Esprit at the cap while generating | User's choice (2026-10-14): an estimate, so never valued. Counts matched on K6qfMamL7rN8yz2Q. |
| dnc/Gauge/feather-overcap | verified | `dancerGaugeEstimates` (named, not valued) | 4 feathers while pressing feather procs | Same. |
| dnc/OGCDDowntime/technical-step | verified | `checkCooldownDrift` | Technical Step held | 100% matched on The Tyrant kill. Hold 250ms as in xivanalysis. |
| dnc/OGCDDowntime/standard-step-finishing-move | verified | `checkCooldownDrift` (shared group, pre-pull evidence) | Standard Step / Finishing Move held | qjCMx4bRfgNKwX9T: xivanalysis 35/37 vs the app's room of 34. Not adopted: the drift simulation has room for only 34. |
| dnc/OGCDDowntime/devilment | verified | `checkCooldownDrift` | Devilment held | The Tyrant 100%. Never reported before 2026-10-16 (no damage of its own); now what an average Devilment added to the party's hits (`BuffLedger.addedBy`). Matched JTADq4kz8PRfF1hN Chimi Doll 3/5 = 2 and zPJaZNfkFAKhY42t Twizzy Iana 2/5 = 3; Chimi's Technical Step 4/5 = 1 (`partyBuffs`: Technical Finish). |
| dnc/OGCDDowntime/flourish | verified | `checkCooldownDrift` | Flourish held | The Tyrant 100%. Valued since 2026-10-16 (`unlockValue`: Fan Dance III and IV, Fountainfall and Reverse Cascade over Fountain and Cascade). Matched Chimi Doll 5/10 = 5. |
| dnc/AoEUsages/windmill | verified | `dancerAoe` (vs Cascade) | Windmill hitting one target | Built 2026-10-15. Premise holds: Cascade is always the alternative. Fires on jN3XDrf2z8PmLgRJ Red Hot and Deep Blue pull 34 3:59 (the bosses apart, both targetable), d3vRbwfpNBLzJ2Xh pull 2 2:42 (Red Hot left as it landed), pG319BgHTnPJc6Ft Necron pull 2 3:53 (one Icy Hand); 8-12k. Matched xivanalysis on Red Hot and Deep Blue pull 34 (FFLogs fight 47): 1 of 1. |
| dnc/AoEUsages/rising-windmill | covered | `dancerAoe` (vs Reverse Cascade) | Rising Windmill hitting one target | Fires on pG319BgHTnPJc6Ft Necron pull 7 2:24 and fJxTNgwtRKjYbvZp Red Hot and Deep Blue 7:32 (4k each). |
| dnc/AoEUsages/bloodshower | covered | `dancerAoe` (vs Fountainfall) | Bloodshower hitting one target | Fires on bVDR2mTL7YGvMxK1 Red Hot and Deep Blue pull 1 5:18 (11k). |
| dnc/Combos/broken | verified | `checkCombos` | Cascade → Fountain or Windmill → Bladeshower broken or timed out | qjCMx4bRfgNKwX9T: its 9 broken combos match by time; K6qfMamL7rN8yz2Q Cascade run out at 8:29 and 6:00 matched. |
| dnc/Weaving/too-many-weaves | verified | `checkGcdGaps` `gcd-clipping` | 3 oGCDs after a GCD | K6qfMamL7rN8yz2Q Red Hot and Deep Blue 0:54 (2.0s) matched. |
| dnc/AlwaysBeCasting/uptime | superseded | `checkGcdGaps` | idle GCD time | Uptime 98.3% matched on Red Hot and Deep Blue. Its GCD downtime list matches the app's gaps by time; the app adds a few it treats as downtime (Coffinmaker's death at 2:00). |
| dnc/Death/died | covered | `checkDeaths` | a death | Generic. |

Core modules that can't fire for Dancer: Interrupts, DoTs, Positionals,
Swiftcast, Lucid Dreaming, Overheal, proc-on-invulnerable (off).

**Display only, no rule:** Defensives (Shield Samba, Improvisation, Curing
Waltz; not adopted as healing / mitigation), the core Tincture table, the
feather and Esprit graphs, the proc issue table.

## Records

| id | source | trigger / threshold | damage | log-visible | doubts |
|---|---|---|---|---|---|
| dnc/Technicalities/gcd-count | dnc/modules/Technicalities.tsx:20-27, 52-60, 82-116; core ExpectedGcdCountEvaluator.tsx | min(8, ⌈(len − 250ms) ÷ GCD⌉) GCDs; steps, finishes and autos ignored. Minor 1, Medium 2, Major 3 missed | yes | yes | counts downtime and death inside the window |
| dnc/Technicalities/expected-actions | Technicalities.tsx:29-41, 118-146, 170-189 | Dawn 1, Finishing Move 1, Starfall 1, Tillana 1, Last/Saber 4 (3 with no filler), Fan Dance IV 1; rushed end-of-pull window → 0. Medium 1, Major 3 | yes | yes (procs inferred) | assumes each proc was available |
| dnc/Technicalities/bad-gcds | Technicalities.tsx:43-50, 148-161 | any Cascade, Reverse Cascade, Fountain, Windmill, Rising Windmill, Bladeshower. Minor 1, Medium 2, Major 3 | yes | yes | out of Esprit, a filler is forced |
| dnc/Technicalities/timely-devilment | evaluators/TimelyDevilmentEvaluator.tsx:15-55 | Devilment not the first non-dance action of the window. Minor 1, Medium 2, Major 3 | yes (in principle) | yes | any oGCD ahead of it fails |
| dnc/Technicalities/late-standard | evaluators/LateStandardEvaluator.tsx:10-42 | the window's last action is Standard Step. Minor 1, Medium 2, Major 3 | yes | yes | steps ignored, Standard Finish counted, so it fails only when the finish lands after the buff; Finishing Move and the lost Last Dance aren't looked at |
| dnc/Technicalities/pooled-feathers | evaluators/PooledFeathersEvaluator.tsx:11-12, 52-101; Gauge.tsx:190-195 | < 3 Fan Dance / Fan Dance II in a window after any spent since the previous window's end + 0.5s; opener n/a; cut windows need ≥ fitting GCDs − 1. Minor 1, Medium 2, Major 3 | yes | no (simulated feathers) | rests on the simulated gauge |
| dnc/Technicalities/bad-devilments | Technicalities.tsx:66-67, 95-102, 196-211, 229-241 | Devilment with no Technical window or status up. Minor 1, Medium 2, Major 3 | yes | yes | no opener excuse; phase holds not seen |
| dnc/Technicalities/players-buffed, raid-buff-overwrite | core RaidBuffWindow.ts:68-80, 102-110 | display only | indirect | yes | — |
| dnc/DirtyDancing/correct-finish | evaluators/CleanDanceEvaluator.tsx:47-90; DirtyDancing.tsx:71-87 | finisher isn't Double Standard / Quadruple Technical; n/a if the pull ends or invulnerable within 4.5s / 6.5s. Minor 1, Medium 3, Major 5 | yes | yes | double-counts zero-step finishes |
| dnc/DirtyDancing/zero-step-standard | evaluators/ZeroStepStandardEvaluator.tsx:26-51 | finisher is Standard Finish (16003). Medium 1, Major 2 | yes | yes | — |
| dnc/DirtyDancing/zero-step-technical | evaluators/ZeroStepTechnicalEvaluator.tsx:26-49 | finisher is Technical Finish (16004). Major at 1 | yes | yes | — |
| dnc/DirtyDancing/no-extra-moves | evaluators/FootlooseEvaluator.tsx:32-59 | dance moves > 2 (Standard) or 4 (Technical). Minor 1, Medium 3, Major 5 | yes | yes | — |
| dnc/DirtyDancing/hit-target | evaluators/HitTargetEvaluator.tsx:36-62; DirtyDancing.tsx:128-152 | the finish's damage event isn't a hit and the target isn't invulnerable. Minor 1, Medium 3, Major 5 | yes | yes | untargetable / unable to act not excused |
| dnc/DirtyDancing/standard-finish-uptime | DirtyDancing.tsx:154-178 | checklist 95%: (uptime on friends − downtime) ÷ (pull − downtime) | yes | yes | summed over friends; death not excluded |
| dnc/DirtyDancing/closed-position-uptime | DirtyDancing.tsx:154-160, 180-193 | checklist 95%, same formula for Closed Position | yes | yes | partner death counts as a loss |
| dnc/Procs/dropped | dnc/modules/Procs.tsx:6-51; core Procs.tsx:259-283, 322-333 | 8 procs (Threefold, Fourfold, Silken / Flourishing Symmetry and Flow, Flourishing Starfall, Flourishing Finish); Silken consumed first. Minor 1, Medium 2, Major 3 | yes | yes | Silken vs Flourishing assignment can mislabel which dropped |
| dnc/Procs/overwritten | Procs.tsx:6-43, 53-58; core Procs.tsx:199-217 | same 8 procs, applied while held. Minor 1, Medium 2, Major 3 | yes | yes | Threefold and Silken procs are random; some overwrites are luck |
| dnc/Gauge/esprit-overcap | Gauge.tsx:17-21, 58-131, 221-330 | Esprit simulated (own +5 / +10 / Tillana +50; party 20% per hit, per-job rates) or read from gauge events; lost Sabers = overcap ÷ 50. Logged: 1/3/5, simulated: 1/5/10 | yes | no (simulated unless gauge events) | party Esprit is random |
| dnc/Gauge/feather-overcap | Gauge.tsx:24-35, 120-125, 277-282, 332-343 | +0.5 feather per proc GCD hit, −1 per Fan Dance / II, max 4. Minor 1, Medium 5, Major 10 | yes | no (simulated) | pooling 4 before Technical is deliberate |
| dnc/OGCDDowntime/* | dnc/modules/OGCDDowntime.tsx:3-26; core CooldownDowntime.tsx | Technical Step (hold 250ms); Standard Step + Finishing Move (shared, hold 250ms, first use −15s); Devilment; Flourish (1.25s). Checklist 95% | yes | yes | phase holds count as lost |
| dnc/AoEUsages/* | dnc/modules/AoEUsages.ts:3-23; core AoEUsages.tsx | Windmill / Rising Windmill / Bloodshower under 2 targets. Minor 1, Medium 4, Major 7 | yes | yes | Rising Windmill / Bloodshower may save a proc |
| dnc/Combos/broken | dnc/modules/Combos.ts:3-5; core Combos.tsx | core rule on Cascade → Fountain, Windmill → Bladeshower. Minor 1, Medium 2, Major 4 | yes | yes | — |
| dnc/Weaving, AlwaysBeCasting, Death | core (no overrides) | core rules | yes | yes | — |

## Open

In priority order (biggest damage cost first):

1. **dnc/DirtyDancing/hit-target** (covered). Not seen firing; the buff
   it fails to give isn't valued.
2. **dnc/DirtyDancing/closed-position-uptime** (candidate). Never seen
   down past a 2s partner swap on 442 pulls. The 4 lowest Vamp Fatale
   Dancers (ff-probe, 2026-10-16) never reapplied Closed Position in the
   fight (held from before the pull throughout).
