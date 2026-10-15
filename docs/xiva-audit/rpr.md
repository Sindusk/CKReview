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
  `whorl`), `tracked-cooldowns.ts` ("Reaper"), generic checks. Case
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
| rpr/Procs/overwritten-gibbet | candidate | — | Enhanced Gibbet granted while held | Minor 1, Medium 5. The app's `procOverwrites` covers Dancer and Bard only. 60 potency each. |
| rpr/Procs/overwritten-gallows | candidate | — | Enhanced Gallows granted while held | Same. |
| rpr/Procs/expired-gibbet | covered | `checkProcs` | Enhanced Gibbet expiring | Medium 1, Major 2. Not seen firing. |
| rpr/Procs/expired-gallows | covered | `checkProcs` | Enhanced Gallows expiring | Same. |
| rpr/Procs/core-suggestions-off | no-damage | — | — | Enhanced Cross / Void Reaping and Harpe aren't reported in xivanalysis. |
| rpr/Harpe/statistic | verified | `checkInterrupts` + `checkDisengages` | Harpe pressed | A statistic. Vamp's cancelled Harpes matched. |
| rpr/Reaver/dropped | candidate | — | a Soul Reaver stack lost to another press | Medium 1, Major 2. A lost Gibbet / Gallows (and its Shroud). The log shows the stack's removal beside the wrong press. It never counts a plain timeout (that's `checkProcs`). |
| rpr/Executioner/dropped | candidate | — | an Executioner stack lost to another press | Same, for Executioner's Gibbet / Gallows. |
| rpr/OtherGauges/soul-overcap | unverifiable | — | Soul over 100 | Minor 10, Medium 30, Major 50. A cast simulation runs short: the kill gains 1800, spends 1850 and goes below zero 4 times (some gains aren't casts, probably an enemy dying under Death's Design). qjCMx4bRfgNKwX9T's 20 not adopted. |
| rpr/OtherGauges/shroud-overcap | verified | `shroud` | Shroud over 100 | FRU 10 lost matched. |
| rpr/DeathsDesign/uptime | verified | `deathsDesign` (from the Reaper's hits) | hits without Death's Design | Checklist 95%. Per target in the app; its union over foes hides gaps on a second boss. |
| rpr/HarvestMoon/uses | verified | `harvestMoon` | a downtime without Soulsow, or Harvest Moon held through one | Checklist 100%. qjCMx4bRfgNKwX9T 5/4 matched; FRU: 7 chances from invulnerability vs the app's 9 from untargetable windows. |
| rpr/AoE/too-few-targets | covered | `whorl` | an AoE GCD on too few targets (Guillotine and Spinning Scythe 4, others 3) | Only Whorl of Death is checked (Vamp 5:00, qjCMx4bRfgNKwX9T 2 matched). Executioner's / Guillotine, Spinning Scythe, Soul Scythe, Grim Swathe, Lemure's Scythe aren't. |
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
| rpr/AoE/too-few-targets | modules/AoE.ts:4-49 | Guillotine / Spinning Scythe under 4, other AoE under 3: Minor 1, Medium 4, Major 7 | yes | yes | — |
| rpr/Combos, Positionals, Weaving, AlwaysBeCasting, Death | modules/Combos.ts, Positionals.ts:16-46; core | core rules | yes | yes | — |

## Open

In priority order (biggest damage cost first):

1. **rpr/Reaver/dropped, rpr/Executioner/dropped** (candidates). A lost
   Gibbet / Gallows each. Needs a pull where a stack is dropped.
2. **rpr/AoE/too-few-targets** (covered for Whorl only). Add the other
   pairs, with Guillotine / Spinning Scythe at 4 (7.2+).
3. **rpr/Procs/overwritten-gibbet, gallows** (candidates). Extend
   `procOverwrites` to Enhanced Gibbet / Gallows.
4. **rpr/OtherGauges/soul-overcap** (unverifiable until the missing Soul
   source is found).
5. **rpr/Procs/expired-gibbet, gallows** (covered). Not seen firing.
