# xivanalysis audit: Dragoon

- **Clone:** xivanalysis `f532855e635bdfb4211cec8128d582dadfdc6a75`
  (2026-09-25). Records extracted 2026-10-15 by a Sonnet subagent (batch 1),
  spot-checked (3 of 3 matched their source); reconciled in the main session.
  Sources are relative to `src/parser/` in the clone.
- **Patch:** no patch branches in `jobs/drg`; supported 7.0–7.5. Nastrond's
  expectation went from 3 to 1 a window in 7.1 (changelog, not a branch).
- **App:** `lib/damage/ffxiv/jobs/melee.ts` (header, `DRG_CHECKS`: Power
  Surge `uptime`, `lanceCharge`, `lifeOfTheDragon`, `lifeSurge`,
  `chaoticSpring`, `firstmindsFocus`, `starcrossDropped`), `gauges.ts`
  (Focus lane), `tracked-cooldowns.ts` ("Dragoon", Life Surge valued as a
  forced crit), generic checks. Case studies: jN3XDrf2z8PmLgRJ Vamp pull 8,
  2T1HzdPKgbhM43am, qjCMx4bRfgNKwX9T, K6qfMamL7rN8yz2Q (three kills).

## Ledger

| id | status | app check | fires-on | notes |
|---|---|---|---|---|
| drg/Buffs/power-surge-uptime | verified | Power Surge `uptime` | Power Surge dropping | Matched on four kills. Its 101.4% on Red Hot divides by fight time less invulnerability; the log has it down 11.9s from 6:43, which the app counts. |
| drg/Buffs/life-surge-bad-consumer | verified | `lifeSurge` | Life Surge on a weak GCD (or Coerthan Torment under 3 targets) | Minor 1, Medium 2, Major 4. qjCMx4bRfgNKwX9T 14:13 (Lance Barrage) matched. |
| drg/Buffs/life-surge-chart | no-damage | — | — | Chart. |
| drg/Debuffs/chaotic-spring-uptime | verified | `chaoticSpring` | Chaotic Spring off the target | Checklist 90%. Red Hot's 62.2% is its denominator; the 20.2s gap from 6:39 (a wrong combo route) is counted. |
| drg/Debuffs/chaotic-spring-clipping | superseded | `chaoticSpring` (`dotFindings`, per target, combo-aware) | Chaotic Spring refreshed early (5s / 10s / 15s a minute) | Target-blind sum, and Chaotic Spring is a combo step, refreshed when the combo comes round. The app's per-target finding: 36 on 617 Dragoon pulls on disk (d3vRbwfpNBLzJ2Xh Red Hot and Deep Blue Pull 3, Sayacissa Morsaelth, 3:27: 8.7s, 15k). Proposed `wrong`; the user chose `superseded` 2026-10-18. |
| drg/Debuffs/applied-into-invuln | wrong | — | Chaotic Spring shortly before invulnerability | Table only. It's a combo step, not an optional DoT GCD. |
| drg/Gauge/fmf-overcap | verified | `firstmindsFocus` | Firstminds' Focus over 2 | Medium 1, Major 2. Red Hot 8:46 matched; Vamp 0 lost in both. |
| drg/Weaving/too-many | verified | `checkGcdGaps` | triple weaves (Stardiver counts double) | Red Hot 6:39 matched. |
| drg/AlwaysBeCasting/uptime | superseded | `checkGcdGaps` | idle GCD time | Downtimes match by time on three kills (most are shared movement, forced). |
| drg/OGCDDowntime/uses | verified | `checkCooldownDrift` + `usesLostAtKill` | High Jump, Geirskogul, Dragonfire Dive, Life Surge, Lance Charge or Battle Litany held | Lance Charge unreported before 2026-10-16 (no damage of its own); now `selfBuffValue` (+10%): QhRqZBwpyCY3Pja9 Vyseras 3 lost = xivanalysis's 7/10. Battle Litany (a party buff) still unvalued. The Tyrant 100%. Vamp Life Surge 13/14 built (valued as a forced crit, 25k). Red Hot's High Jump 16/17, Life Surge 13/14, DFD 4/5 not adopted: each held under one recharge. |
| drg/Procs/dropped | covered | `checkProcs` + `starcrossDropped` | Dive Ready, Nastrond Ready, Dragon's Flight or Starcross Ready lost | Medium 1, Major 2. Starcross is the one removed by another press (Life of the Dragon ending): The Tyrant 5:29 built (161k), ~60 across the samples. Expiries of the others not seen firing. |
| drg/Procs/overwritten-and-invuln | no-damage | — | — | Off for Dragoon. |
| drg/Positionals/missed | verified | `checkPositionals` | a missed rear / flank | jN3XDrf2z8PmLgRJ, 2T1HzdPKgbhM43am 13, qjCMx4bRfgNKwX9T 17, Vamp 5, Red Hot 4, The Tyrant 13 matched one for one. |
| drg/Combos/broken | verified | `checkCombos` | a broken combo | Red Hot's wrong route at 6:42 is counted through Power Surge and Chaotic Spring (120k + 38k). Since 2026-10-16 a positional-only bonus no longer reads as a landed combo (see sam.md, Combos): Fang and Claw / Wheeling Thrust pressed out of the chain now count (jN3XDrf2z8PmLgRJ Red Hot and Deep Blue pull 39 0:56.7, Fang and Claw twice; ~20 on disk, one player). Matched xivanalysis 2026-10-16 on that pull (Sayacissa Morsaelth): 2 = 2 (0:56.7, 4:32.6), both found only since that fix. |
| drg/LanceCharge/gcd-count | verified | `lanceCharge` expectedGcds 8 | Lance Charge under 8 GCDs | 2T1HzdPKgbhM43am 9 matched (most forced); qjCMx4bRfgNKwX9T's are forced; Vamp every window full. |
| drg/LanceCharge/expected-actions | verified | `lanceCharge` expected | High Jump, Mirage Dive, DFD, Rise, Geirskogul, Nastrond, Stardiver or Starcross missing | Red Hot 2:07 High Jump and Mirage Dive, 3:10, 4:13, 5:13 Mirage Dive; The Tyrant 9:10 matched. |
| drg/LanceCharge/life-surge-display | no-damage | — | — | Display only. |
| drg/BattleLitany/gcd-count | superseded | `lanceCharge` | Battle Litany under 8 GCDs | Battle Litany lines up with Lance Charge, so the app judges the Lance Charge window. |
| drg/BattleLitany/expected-actions | superseded | `lanceCharge` | the burst actions missing from Battle Litany | Same. |
| drg/BattleLitany/life-surge-display | no-damage | — | — | Display only. |
| drg/BattleLitany/players-buffed | verified | buffs.ts coverage | Battle Litany missing a player | Display only in xivanalysis. Red Hot 4:16 missing two players (80k) matched. |
| drg/BattleLitany/raid-buff-overwrite | no-damage | — | — | Note column. |
| drg/BloodOfTheDragon/gcd-count | verified | `lifeOfTheDragon` | under 8 GCDs in Life of the Dragon | Vamp 5:11, 7:12 at 7/8 and Red Hot 3:12 6/8, 6:39 7/8 matched. Life of the Dragon (+15%) is only in hit snapshots. |
| drg/BloodOfTheDragon/expected-actions | verified | `lifeOfTheDragon` + `lanceCharge` | Nastrond, Stardiver, Starcross, Mirage Dive missing from Life of the Dragon | Mirage Dive missing is valued at Lance Charge's 10% only (a few k). |
| drg/BloodOfTheDragon/life-surge-display | no-damage | — | — | Display only. |
| drg/Death/died | covered | `checkDeaths` | a death | Generic. |

Core modules that can't fire for Dragoon: Swiftcast, Lucid, Overheal,
Interrupts (no cast times).

**Display only, no rule:** Life Surge chart, Defensives (Feint,
Bloodbath, Second Wind: not adopted).

## Records

| id | source | trigger / threshold | damage | log-visible | doubts |
|---|---|---|---|---|---|
| drg/Buffs/power-surge-uptime | drg/modules/Buffs.tsx:118-137 | uptime ÷ (pull − invulnerable): checklist (default target) | yes | yes | downtime not subtracted |
| drg/Buffs/life-surge-bad-consumer | Buffs.tsx:19-29, 88-153 | Life Surge on a listed weak GCD, or Coerthan Torment under 3: Minor 1, Medium 2, Major 4 | yes | yes | blacklist |
| drg/Debuffs/chaotic-spring-uptime | drg/modules/Debuffs.tsx:13-32 | checklist 90% | yes | yes | averaged over targets |
| drg/Debuffs/chaotic-spring-clipping | Debuffs.tsx:34-51 | ms per minute: Minor 5s, Medium 10s, Major 15s | yes (in principle) | yes | target-blind |
| drg/Gauge/fmf-overcap | drg/modules/Gauge.tsx:12-80 | stacks gained at 2: Medium 1, Major 2 | yes | no (inferred) | starts at 0 |
| drg/Weaving/too-many | drg/modules/Weaving.ts:4-20 | core limit; Stardiver counts double: Medium 1, Major 5 | yes | yes | — |
| drg/OGCDDowntime/uses | drg/modules/OGCDDowntime.ts:1-39 | High Jump, Geirskogul, DFD, Life Surge (2 charges), Lance Charge, Battle Litany; checklist 95% | yes | yes | phase holds count |
| drg/Procs/dropped | drg/modules/Procs.tsx:8-35 | four proc groups dropped: Medium 1, Major 2 | yes | yes | — |
| drg/Positionals/missed | drg/modules/Positionals.ts:3-9; core | hit ÷ total per action (checklist) | yes | yes (bonusPercent) | — |
| drg/Combos/broken | drg/modules/Combos.ts:4-6; core | Minor 1, Medium 2, Major 4 | yes | yes | — |
| drg/LanceCharge/* | drg/modules/LanceCharge.tsx:16-190 | min(8, ⌈(len − 250ms) ÷ GCD⌉): Minor 1, Medium 2, Major 4; expected actions: Minor 1, Medium 3, Major 5 | yes | yes | — |
| drg/BattleLitany/* | drg/modules/BattleLitany.tsx:12-113 | same as Lance Charge; DFD always expected | yes | yes | — |
| drg/BloodOfTheDragon/* | drg/modules/BloodOfTheDragon.tsx:15-191 | a 20s window from Geirskogul; same tiers | yes | yes (window inferred) | — |

## Open

1. **drg/Procs/dropped** (covered). Dive Ready expiries fire on
   QhRqZBwpyCY3Pja9 (fetched 2026-10-16; fight 2, Vyseras Targaryen): 0:29.8
   and 5:56.3 (45k each), 2:56.8 forced (boss untargetable). Matched
   xivanalysis 2026-10-16: "You dropped 2 procs" = the two unforced. Nastrond Ready and Dragon's Flight were lost only at deaths in the
   15 lowest Red Hot and Deep Blue Dragoons.
