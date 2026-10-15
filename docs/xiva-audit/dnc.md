# xivanalysis audit: Dancer

- **Clone:** xivanalysis `f532855e635bdfb4211cec8128d582dadfdc6a75`
  (2026-09-25). Records extracted 2026-10-15 by a Sonnet subagent (batch 1),
  spot-checked (3 of 3 matched their source); reconciled in the main session.
  Sources are relative to `src/parser/` in the clone.
- **Patch:** no patch branches in `jobs/dnc`; supported 7.0–7.5. The gauge
  code switches on whether the log has `gaugeUpdate` events, not on patch.
- **App:** `lib/damage/ffxiv/jobs/ranged.ts` (header, `DNC_CHECKS`:
  `technical`, `technicalFillers`, `dancerOverwrites`,
  `dancerGaugeEstimates` + `unpooledFeathers`), `gauges.ts` (Feathers,
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
| dnc/Technicalities/timely-devilment | wrong | — | Devilment not the first action in the window | Any oGCD before it fails, even in the same weave slot. A Devilment 0.67s late still covered every GCD (dps-analysis.md). The late Devilment at qjCMx4bRfgNKwX9T 14:07 was in forced time. |
| dnc/Technicalities/bad-devilments | candidate | — | Devilment pressed with no Technical Finish up | Devilment's own drift is covered (tracked cooldown); its misalignment isn't. No opener excuse in the code despite the text. Premise check: usually the opener or a phase hold. Low cost. |
| dnc/Technicalities/late-standard | superseded | `technical` | Standard Step as the last action of a window | The window's GCD and action counts carry what a late Standard displaces. Fires even when the finish still landed inside the buff. |
| dnc/Technicalities/players-buffed | covered | buffs.ts coverage | a Technical Finish that missed a player | Display only in xivanalysis. |
| dnc/Technicalities/raid-buff-overwrite | no-damage | — | two Dancers' Technical Finishes overlapping | A note column; no single-Dancer static hits it. |
| dnc/DirtyDancing/correct-finish | candidate | — | a dance finished with fewer steps than Double Standard / Quadruple Technical | A short dance lowers Standard / Technical Finish's buff for the party. The app sees the dance's time (holds, gaps) but not the step count. The 0-step Standard Finish at qjCMx4bRfgNKwX9T 11:50 was in forced time. Double-counts with the zero-step rules. |
| dnc/DirtyDancing/zero-step-standard | candidate | — | Standard Finish with no steps | Same as correct-finish; tiers 1 Medium, 2 Major. |
| dnc/DirtyDancing/zero-step-technical | candidate | — | Technical Finish with no steps | No party buff at all: the costliest Dancer mistake. Major at 1. |
| dnc/DirtyDancing/no-extra-moves | candidate | — | a wrong step pressed in a dance | Each costs ~1s of GCD time the gap check can't see (a step is a 1s GCD). |
| dnc/DirtyDancing/hit-target | covered | `noDamageCasts` | a finish that hit nothing | The app values the finish's own damage, not the buff that wasn't given. Not seen firing. |
| dnc/DirtyDancing/standard-finish-uptime | superseded | `checkCooldownDrift` (Standard Step) | Standard Finish lapsing | Re-dancing on time is the Standard Step drift. Sums over every friend and subtracts downtime from both sides. |
| dnc/DirtyDancing/closed-position-uptime | candidate | — | no dance partner, or Closed Position dropped | Losing a partner costs their Standard Finish and Devilment. Rare in a static. Premise check: a partner's death shouldn't count. |
| dnc/Procs/dropped | verified | `checkProcs` | a proc left to expire | K6qfMamL7rN8yz2Q matched: Silken Flow 4:29 and 8:30.8, Silken Symmetry 8:30. jN3XDrf2z8PmLgRJ pull 8 Symmetry matched. |
| dnc/Procs/overwritten | verified | `dancerOverwrites` | a proc granted while held | Matched on jN3XDrf2z8PmLgRJ pull 8, qjCMx4bRfgNKwX9T 15:59, K6qfMamL7rN8yz2Q 8:49. The app tracks 6 of xivanalysis's 8: Flourishing Starfall and Flourishing Finish are not in `DNC_PROCS` (a Flourish or Technical Step with Starfall / Tillana still held). |
| dnc/Gauge/esprit-overcap | verified | `dancerGaugeEstimates` (named, not valued) | Esprit at the cap while generating | User's choice (2026-10-14): an estimate, so never valued. Counts matched on K6qfMamL7rN8yz2Q. |
| dnc/Gauge/feather-overcap | verified | `dancerGaugeEstimates` (named, not valued) | 4 feathers while pressing feather procs | Same. |
| dnc/OGCDDowntime/technical-step | verified | `checkCooldownDrift` | Technical Step held | 100% matched on The Tyrant kill. Hold 250ms as in xivanalysis. |
| dnc/OGCDDowntime/standard-step-finishing-move | verified | `checkCooldownDrift` (shared group, pre-pull evidence) | Standard Step / Finishing Move held | qjCMx4bRfgNKwX9T: xivanalysis 35/37 vs the app's room of 34. Not adopted: the drift simulation has room for only 34. |
| dnc/OGCDDowntime/devilment | verified | `checkCooldownDrift` | Devilment held | The Tyrant 100%. |
| dnc/OGCDDowntime/flourish | verified | `checkCooldownDrift` | Flourish held | The Tyrant 100%. |
| dnc/AoEUsages/windmill | candidate | — | Windmill hitting one target | **The app has no Dancer AoE check** (`DNC_CHECKS` has no `aoeComboOnOneTarget`). Pairs to add: Windmill/Cascade, Rising Windmill/Reverse Cascade, Bloodshower/Fountainfall, all minimum 2. |
| dnc/AoEUsages/rising-windmill | candidate | — | Rising Windmill hitting one target | See windmill. |
| dnc/AoEUsages/bloodshower | candidate | — | Bloodshower hitting one target | See windmill. |
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
| dnc/Technicalities/late-standard | evaluators/LateStandardEvaluator.tsx:10-42 | the window's last action is Standard Step. Minor 1, Medium 2, Major 3 | yes | yes | ignores time left in the window |
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

1. **dnc/DirtyDancing/zero-step-technical, correct-finish,
   zero-step-standard** (candidates). One check: the finisher's step count,
   valued at the buff lost on the party's damage over its duration (the
   ledger's measured Technical / Standard Finish share). Premise check:
   find a short dance outside forced time.
2. **dnc/AoEUsages/*** (candidates). Add `aoeComboOnOneTarget` pairs to
   `DNC_CHECKS`; a trivial build once a pull with a one-target Windmill
   turns up.
3. **dnc/Procs/overwritten, Flourishing Starfall and Flourishing Finish.**
   Add them to `DNC_PROCS` after checking that a Flourish / Technical
   Step with one held logs a "refreshed".
4. **dnc/DirtyDancing/no-extra-moves** (candidate). ~1s per wrong step.
5. **dnc/Technicalities/bad-devilments** and
   **dnc/DirtyDancing/closed-position-uptime** (candidates, rare).
6. **dnc/DirtyDancing/hit-target** (covered). Not seen firing; the buff
   it fails to give isn't valued.
