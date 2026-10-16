# xivanalysis audit: Reaper

- **Clone:** xivanalysis `f532855e635bdfb4211cec8128d582dadfdc6a75`
  (2026-09-25). Records extracted 2026-10-15 by a Sonnet subagent (batch 2),
  spot-checked (3 of 3 matched their source); reconciled in the main session.
  Sources are relative to `src/parser/jobs/rpr/` in the clone.
- **Patch:** no patch branches; supported 7.0–7.5. 7.2 raised Executioner's
  Guillotine and Spinning Scythe's AoE breakpoint from 3 to 4 (hard-coded
  now, so pre-7.2 logs are judged at 4 too); 7.3 gave Enshroud a 5s cooldown
  (data only).
- **App:** `lib/damage/ffxiv/jobs/melee.ts` (Reaper section, `RPR_CHECKS`:
  `enshroud`, `arcaneCircle`, `deathsDesign`, `harvestMoon`, `shroud`,
  `rprAoe`, `reaperStacks`, `reaperEnhancedOverwrites`),
  `tracked-cooldowns.ts` ("Reaper"), generic checks. Case
  studies: jN3XDrf2z8PmLgRJ Vamp pull 8, dDar482XvFKBPJYh FRU,
  qjCMx4bRfgNKwX9T Dancing Mad.
- **xivanalysis quirks found** (from the extraction):
  - `Interrupts.tsx` is never loaded (not in `modules/index.ts`); the core
    one runs instead.
  - `Procs.tsx:89, 144`: the "why" potency is `badStalks × 60`, whatever
    the expired count.
  - `Reaver.tsx`: a Soul Reaver that simply times out is never counted
    (only a press that drops it is).
  - `Positionals.ts:29-42`: the two Executioner's branches are identical.
  - Arcane Circle's rushed-window branch can expect 3.5 Reapings.

## Ledger

| id | status | app check | fires-on | notes |
|---|---|---|---|---|
| rpr/ArcaneCircle/expected-actions | verified | `arcaneCircle` | under 7 Reapings, 4 Lemure's, 2 Sacrificium, 1 Plentiful Harvest, 2 Communio in Arcane Circle (half in the opener) | Minor 1, Medium 3, Major 5. FRU 27 matched (single Enshrouds at 8:30, 10:37, 14:18, 16:18, 18:18). |
| rpr/ArcaneCircle/perfectio-display | no-damage | — | — | Display only; Perfectio isn't expected. |
| rpr/ArcaneCircle/players-buffed | covered | buffs.ts coverage | Arcane Circle missing a player | Display only in xivanalysis. |
| rpr/ArcaneCircle/raid-buff-overwrite | no-damage | — | — | Note column. |
| rpr/Enshroud/expected-actions | verified | `enshroud` | an Enshroud short of 4 Reapings, 2 Lemure's, 1 Sacrificium, 1 Communio | Minor 1, Medium 3, Major 5. qjCMx4bRfgNKwX9T 6:12's 6 missed (cashed before P2's downtime) counted. It expects a Sacrificium in every Enshroud, even without Immortal Sacrifice. |
| rpr/Enshroud/alternated-reapings | no-damage | — | Reapings not alternated | A note column. A wrong Reaping loses its Enhanced status, which the Reaping count doesn't see. |
| rpr/Tincture/communio | superseded | tincture.ts | under 2 Communios under the tincture | qjCMx4bRfgNKwX9T 1:58, 17:48 became the placement finding. |
| rpr/Tincture/window-table | no-damage | — | — | Table only. |
| rpr/CooldownDowntime/uses | verified | `checkCooldownDrift` | Arcane Circle, Soul Slice / Scythe or Gluttony held | FRU Soul Slice 36/38 recharged through P4's downtime (not counted); Arcane Circle 9/10 held for the 14:18 burst. |
| rpr/Drift/gluttony | superseded | `checkCooldownDrift` | Gluttony drifting | A table only. qjCMx4bRfgNKwX9T 31s / 25s at two-minute marks: 18/18, no use lost. Vamp: 1 use found against its 8 of 10. |
| rpr/Procs/overwritten-gibbet | covered | `reaperEnhancedOverwrites` | Enhanced Gibbet granted while held | Built 2026-10-16 with Gallows and Void / Cross Reaping: a "refreshed" event beside the unenhanced press; ~10% of her average of it (enhanced hits measured ~11.5% over plain on disk). 49 on disk (AYQm9Kd8Ct4FxcGp Lindwurm pull 32, Cross Reaping twice at 6:19.6 and 6:22.6). FFLogs top 20: 1 in 794. xivanalysis's page for that pull (Sonder Dreams) is silent by design: its RPR Procs tracks Void / Cross Reaping but reports overwrites only for Gibbet / Gallows. The log confirms the 6:22.6 refresh; the app's call stands. A Gibbet / Gallows overwrite is still unmatched on a page. |
| rpr/Procs/overwritten-gallows | covered | `reaperEnhancedOverwrites` | Enhanced Gallows granted while held | Same. |
| rpr/Procs/expired-gibbet | verified | `reaperEnhancedOverwrites` (expiries) | Enhanced Gibbet expiring | Medium 1, Major 2. Moved out of `checkProcs` 2026-10-16: it charged a whole Gibbet (54-71k, 6 on disk) where only the ~10% enhancement is lost, and missed most (Gibbet and Executioner's Gibbet split the removals under its 60%). Now ~10% of the average, counted only when a Soul Reaver or Executioner came in between and went elsewhere: without one nothing could use it, and those sat at one fight moment on every pull (pG319BgHTnPJc6Ft Necron ~5:00, rgTafHJ9MN47m3Vy Doomtrain ~4:30; 27 → 9 on disk). Sample: HbJ7m1rpTQvh2aDw (fetched for this; fight 2, Chihiro Omochi, a low Red Hot and Deep Blue parse from ff-probe.js): 3:18 (the Soul Reaver at 3:05 went to a Guillotine) and 6:22, 7k each; 8:43 left out (two Enshrouds, no Soul Reaver in its minute). Matched xivanalysis 2026-10-16: its "120 potency lost to Enhanced Gibbet expiring" is two (60 each) = the app's two; Soul Reaver stacks lost 2 = 2 (6:27, 7:37); Gallows overwrite 1 = 1 (7:40). |
| rpr/Procs/expired-gallows | verified | `reaperEnhancedOverwrites` (expiries) | Enhanced Gallows expiring | Same. Fires on jN3XDrf2z8PmLgRJ Red Hot pull 1 1:10, xydWc2pK74HCbZ8q 9:15. Matched xivanalysis 2026-10-16 on xydWc2pK74HCbZ8q (Cynder Gentleheart): 1 = 1 (its potency for it reads 0); Soul Reaver 7 = 7, Executioner 2 = 2, Gluttony 9/10 = 1 on the same page. |
| rpr/Procs/core-suggestions-off | no-damage | — | — | Enhanced Cross / Void Reaping and Harpe aren't reported in xivanalysis. |
| rpr/Harpe/statistic | verified | `checkInterrupts` + `checkDisengages` | Harpe pressed | A statistic. Vamp's cancelled Harpes matched. |
| rpr/Reaver/dropped | verified | `reaperStacks` | a Soul Reaver stack lost to another press | Built 2026-10-16 from the buff stream (removed or refreshed beside a non-spender press, stacks counted); each a Gibbet over her average combo GCD (Shroud not valued). 21 counted on disk, 7 at a death or forced (xydWc2pK74HCbZ8q, 7 in one kill: Unveiled Gibbet 1:28.6 then Shadow of Death 1:31.8). FFLogs top 20: 4 stacks in 629 builds. Matched xivanalysis's 7 on xydWc2pK74HCbZ8q (Cynder Gentleheart). |
| rpr/Executioner/dropped | verified | `reaperStacks` | an Executioner stack lost to another press | Built 2026-10-16, same: 17 counted (6XaWqwMbkZG9pLmx Vamp Fatale 8:32.6, Perfectio with both stacks from Gluttony; fJxTNgwtRKjYbvZp 6:45 Plentiful Harvest and 9:07 Perfectio, 107k each), 3 forced. Matched xivanalysis: fJxTNgwtRKjYbvZp (Bancho Shera) 4 stacks, xydWc2pK74HCbZ8q 2. |
| rpr/OtherGauges/soul-overcap | covered | `rprSoul` (lower bound, 2026-10-16; Open item 2) | Soul over 100 | Minor 10, Medium 30, Major 50. A cast simulation runs short: the kill gains 1800, spends 1850 and goes below zero 4 times (some gains aren't casts, probably an enemy dying under Death's Design). qjCMx4bRfgNKwX9T's 20 not adopted. |
| rpr/OtherGauges/shroud-overcap | verified | `shroud` | Shroud over 100 | FRU 10 lost matched. |
| rpr/DeathsDesign/uptime | verified | `deathsDesign` (from the Reaper's hits) | hits without Death's Design | Checklist 95%. Per target in the app; its union over foes hides gaps on a second boss. |
| rpr/HarvestMoon/uses | verified | `harvestMoon` | a downtime without Soulsow, or Harvest Moon held through one | Checklist 100%. qjCMx4bRfgNKwX9T 5/4 matched; FRU: 7 chances from invulnerability vs the app's 9 from untargetable windows. |
| rpr/AoE/too-few-targets | verified | `rprAoe` (was `whorl`) | an AoE on too few targets (Executioner's Guillotine and Spinning Scythe 4, others 3) | Whorl of Death matched (Vamp 5:00, qjCMx4bRfgNKwX9T 2). All xivanalysis pairs built 2026-10-15; premise holds for each (same resource as its twin). Seen firing, no xivanalysis page for these pulls: jN3XDrf2z8PmLgRJ Red Hot and Deep Blue pull 44 5:18-5:19 (Grim Swathe, Guillotine on one boss, the two apart; 14k, 38k), pull 20 4:15 and bVDR2mTL7YGvMxK1 pull 1 3:40 (Lemure's Scythe, 29k, 40k), pull 13 3:48 (Soul Scythe on both, 29k). xydWc2pK74HCbZ8q's kill fires the rest on both bosses: Spinning Scythe 3:07-7:35 (9-19k), Executioner's Guillotine 6:49 (34k), Grim Reaping 3:57 (23k). Matched xivanalysis on that kill: Spinning Scythe 6, Whorl 3, Guillotine 3, Executioner's Guillotine 1, Grim Reaping 1. Two gaps: Soul Scythe 3 of its 4 (the fourth, 5:39, hit nothing: `noDamageCasts` territory); Grim Swathe 0 of its 3 (the Reaper never pressed Blood Stalk, so there's no average to compare against). |
| rpr/Combos/broken | verified | `checkCombos` | a broken or timed-out combo | Vamp, FRU 4 matched. |
| rpr/Positionals/missed | verified | `checkPositionals` | a missed rear / flank | FRU 8, qjCMx4bRfgNKwX9T 14 matched by action. |
| rpr/Interrupts/not-loaded | verified | `checkInterrupts` | a cancelled Harpe / Soulsow / Communio | The core module runs; the job file is dead. qjCMx4bRfgNKwX9T's cancelled Communio matched. |
| rpr/Weaving/too-many | verified | `checkGcdGaps` | triple weaves | qjCMx4bRfgNKwX9T's weaving gaps matched. |
| rpr/AlwaysBeCasting/uptime | superseded | `checkGcdGaps` | idle GCD time | qjCMx4bRfgNKwX9T matched. |
| rpr/Death/died | covered | `checkDeaths` | a death | Generic. |
| rpr/Defensives/use-table | no-damage | — | — | Mitigation. |

## Records

| id | source | trigger / threshold | damage | log-visible | doubts |
|---|---|---|---|---|---|
| rpr/ArcaneCircle/expected-actions | modules/ArcaneCircle.tsx:12-135 | 7 / 4 / 2 / 1 / 2 per window, opener half: Minor 1, Medium 3, Major 5 | yes | yes | fractional expectation when rushed |
| rpr/Enshroud/expected-actions | modules/Enshroud.tsx:14-129 | 4 Reapings (exact), 2 Lemure's, 1 Sacrificium, 1 Communio: Minor 1, Medium 3, Major 5 | yes | yes | Sacrificium expected without Immortal Sacrifice |
| rpr/Tincture/communio | modules/Tincture.tsx:11-60 | 2 Communios (1 in the opener): Minor 1, Medium 2 | yes | yes | no end-of-pull allowance |
| rpr/CooldownDowntime/uses | modules/CooldownDowntime.ts:3-23 | Arcane Circle, Soul Slice / Scythe, Gluttony; checklist 95% | yes | yes | phase holds count |
| rpr/Drift/gluttony | modules/Drift.tsx:16-152 | table: Gluttony drift | yes | yes | opener not tabulated |
| rpr/Procs/* | modules/Procs.tsx:9-146 | Enhanced Gibbet / Gallows overwritten: Minor 1, Medium 5; expired: Medium 1, Major 2 | yes | yes | 2.3s apply dedupe on Gibbet |
| rpr/Reaver/dropped | modules/Reaver.tsx:12-107 | Soul Reaver dropped by another press: Medium 1, Major 2 | yes | yes | timeouts not counted |
| rpr/Executioner/dropped | modules/Executioner.tsx:12-104 | Executioner dropped by another press (per stack): Medium 1, Major 2 | yes | yes | dropper list copied from Reaver |
| rpr/OtherGauges/* | modules/OtherGauges.tsx:13-149 | Soul / Shroud overcap: Minor 10, Medium 30, Major 50 | yes | no (inferred, start at 0) | Ideal Host timing |
| rpr/DeathsDesign/uptime | modules/DeathsDesign.tsx:11-47 | union uptime over foes: checklist 95% | yes | yes | a second boss masks gaps |
| rpr/HarvestMoon/uses | modules/HarvestMoon.tsx:12-99 | Harvest Moons ÷ (downtimes + 1): checklist 100% | yes | yes | invulnerability, not untargetable |
| rpr/AoE/too-few-targets | modules/AoE.ts:4-49 | Executioner's Guillotine / Spinning Scythe under 4, other AoE under 3: Minor 1, Medium 4, Major 7 | yes | yes | — |
| rpr/Combos, Positionals, Weaving, AlwaysBeCasting, Death | modules/Combos.ts, Positionals.ts:16-46; core | core rules | yes | yes | — |

## Open

In priority order (biggest damage cost first):

1. **rpr/Procs/overwritten-gibbet, gallows** (covered 2026-10-16): no
   page with one yet. AYQm9Kd8Ct4FxcGp pull 32's 6:22.6 is a Void /
   Cross Reaping overwrite, which xivanalysis never reports. Matched
   2026-10-16 on AYQm9Kd8Ct4FxcGp Lindwurm II pull 6 (Sonder Dreams): its
   1 overwrite (60 potency) = the app's Gallows at 0:48 (9k). Its "lost 1
   stack" is an Executioner stack removed at 1:11.9 with no cast, 2s
   before her death ended the wipe: not adopted.
2. **rpr/OtherGauges/soul-overcap**: built 2026-10-16 as a lower bound
   (`rprSoul`). xivanalysis's own model (Harpe, Harvest Moon, +10 per
   enemy dying under Death's Design) still goes below zero on 54 of 342
   Reaper pulls on disk, mostly fights with adds (Necron, Futures
   Rewritten, TEA), so the missing gains are adds dying under Death's
   Design. The check counts only gains that surely happened (combo steps
   that landed, Slice, Spinning Scythe, Soul Slice / Scythe), floors at
   0 and resets at a death, so it never runs above the real gauge and
   any overcap it reports happened. It fires nowhere on disk; the full
   model's overcaps (10-50 on four Sonder Dreams Necron pulls) depend on
   Harpe / Harvest Moon gains. qjCMx4bRfgNKwX9T's xivanalysis 20: the
   full model shows none on that kill (likely its add-death gains).
3. **rpr/Procs/expired-gibbet, gallows** (covered). Not seen firing.
