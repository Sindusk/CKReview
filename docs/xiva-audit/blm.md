# xivanalysis audit: Black Mage

- **Clone:** xivanalysis `f532855e635bdfb4211cec8128d582dadfdc6a75`
  (2026-09-25). Records extracted 2026-10-15 by a Sonnet subagent (batch 3),
  spot-checked (3 of 3 matched their source); reconciled in the main session.
  Sources are relative to `src/parser/jobs/blm/` in the clone.
- **Patch:** heavily patch-branched: 7.2 reworked the job (Thunder moved to
  core DoTs, Triplecast dropped from the cooldown checklist, Ley Lines judged
  by casts under Circle of Power instead of uptime, Firestarter / Thunderhead
  made permanent, a Cold Fire III rule replacing the Firestarter one). Foul
  needs 3 targets before 7.2 and 2 from 7.2; Flare 3 before 7.1, 2 from 7.1.
  Supported 7.0–7.5.
- **App:** `lib/damage/ffxiv/jobs/caster.ts` (`BLM_CHECKS`: `highThunder`,
  `blmAoe`), `tracked-cooldowns.ts` ("Black Mage"), generic checks. Checked
  against xivanalysis once (2T1HzdPKgbhM43am fight 10: 3 interrupted casts,
  2 Freezes). **No Black Mage in the samples' rosters since; most rows are
  unverified.**
- **xivanalysis bugs found** (from the extraction):
  - `FlareStarUsageEvaluator.tsx:33` and `IceMageEvaluator.tsx:54`: the
    "don't count it if they died" test is inverted, so these two suggestions
    count only windows where the player *died*.
  - `RotationWatchdog.tsx:455` reads `lastFlareIndex` inside a branch keyed
    on `manafontFlareIndex`.
  - Thunderhead and Firestarter are permanent from 7.2, so their dropped
    suggestions can't fire there.

## Ledger

| id | status | app check | fires-on | notes |
|---|---|---|---|---|
| blm/DoTs/uptime | covered | `highThunder` (`dotFindings`, against Fire IV) | High Thunder / II off the target | 7.2+ in xivanalysis; it adds two per-status averages, not a union. |
| blm/DoTs/clipping | wrong | — | High Thunder refreshed early (6s / 9s / 12s a minute) | Target-blind, and a Thunderhead refresh up to ~3s early is expected. The app values each refresh (2T1HzdPKgbhM43am: 0.66M read by the old seconds basis). |
| blm/DoTs/applied-into-invuln | superseded | `highThunder` | a High Thunder shortly before invulnerability | Table only. |
| blm/Thunder/uptime | superseded | `highThunder` | (before 7.2) High Thunder off the target | Pre-7.2 module; same check. |
| blm/Thunder/excess-clipping | wrong | — | (before 7.2) clipping past 3s a refresh | Same reasons as clipping. |
| blm/AoEUsages/foul | verified | `blmAoe` (vs Xenoglossy) | Foul on too few targets | The app flags one target only: right from 7.2 (minimum 2); before 7.2 xivanalysis needs 3. |
| blm/AoEUsages/flare | verified | `blmAoe` (vs Fire IV) | Flare on too few targets | Same: right from 7.1. 7yXZbmqcrCga8PHz matched xivanalysis (3 of 3) once a bug was fixed (2026-10-15): two back-to-back Flares (7:43, 7:45) read as one, the second taking the first's in-flight hit. |
| blm/AoEUsages/freeze | verified | `blmAoe` (minimum 3) | Freeze on under 3 | 2T1HzdPKgbhM43am 7:55, 8:15 matched. 7yXZbmqcrCga8PHz: 3 of 3 with the buff-neutral comparison (2026-10-15); the raw one passed the 5:33 Freeze (52k against Blizzard IV's 50k average). |
| blm/AoEUsages/high-fire-ii | verified | `blmAoe` (vs Fire III / Fire IV, minimum 3) | High Fire II on under 3 | Built 2026-10-15. Fires on 7yXZbmqcrCga8PHz Red Hot and Deep Blue 9:27 (both bosses, 65k). Matched xivanalysis there (1 of 1), with Foul 1/1. |
| blm/AoEUsages/high-blizzard-ii | verified | `blmAoe` (vs Blizzard III, minimum 3) | High Blizzard II on under 3 | Two targets clearly lose: ~9.5k a target against Blizzard III's ~45k. Fires on 7yXZbmqcrCga8PHz 5:29, 9:22, 9:50, djChYqt4b7K8aAfP 7:40, q4mQCNpRKwH1PZjb 9:04 (both bosses, 17-26k), xtcaT8y9CGjpPnHK 5:40 (Watery Grave alone, 21k). Matched xivanalysis on 7yXZbmqcrCga8PHz (3 of 3). |
| blm/AoEUsages/high-thunder-ii | covered | `blmAoe` (vs High Thunder, one target; direct hits only) | High Thunder II on one target | Fires on q4mQCNpRKwH1PZjb 6:53, 7:44, 9:18 (one boss with the two apart, 4-8k). The DoT difference isn't valued. |
| blm/AoEUsages/thunder-iv, blizzard-ii, fire-ii | wrong | — | — | Replaced at level 82+; can't occur at 100. |
| blm/OGCDDowntime/uses | covered | `checkCooldownDrift` (hold 5s, first use 15s / Manafont 25s) | Ley Lines, Manafont, Amplifier (and Triplecast before 7.2) held | The app tracks Triplecast on every patch; xivanalysis drops it from 7.2. |
| blm/Procs/dropped-thunderhead | covered | `checkProcs` | Thunderhead expiring | Before 7.2 only (permanent from 7.2). |
| blm/Procs/dropped-firestarter | covered | `checkProcs` | Firestarter expiring | Same. |
| blm/Procs/overwritten-and-invuln-table | no-damage | — | — | Table only. |
| blm/Gauge/lost-polyglot | superseded | `polyglot` (death resets) | the Polyglot timer stopping (Enochian dropped) | From 7.2 Astral Fire / Umbral Ice never time out, so Enochian only drops on a death; the gauge simulation resets there, and the death finding carries the cost. |
| blm/Gauge/overwritten-polyglot | verified | `polyglot` | a Polyglot gained at the cap | Built 2026-10-15 as a gauge simulation from casts (gaugeFindings): Enochian from the first fire or ice spell, +1 every 30s, +1 per Amplifier, −1 per Xenoglossy / Foul, cap 3, reset on death; 7.2+ only. A Polyglot at the cap, or held at a kill (by time held), is her average Xenoglossy over her average GCD. Hand-checked on xz1wjC6gfXmkMKYt (Dester Whitegloomer): Amplifier at 2:05 with 2 held, no spend before the 2:30 tick, a fourth at the cap (66k). Fires on 11 Black Mages on disk, about one each (41-76k). Matched xivanalysis's "Xenoglossy got overwritten" (2026-10-15) on xz1wjC6gfXmkMKYt 1, Q18Xc93x4wpfMFdT 2, 7zwpcLxk2Fd1h6Vr 1, Y9Fh2BHyj3xAqZ6V Zelenia pull 3 1 (its "2 Polyglot stacks lost" there is a death). r4qDkR9btJCXnKWd Doomtrain pull 6 (Laura Razzy) 4:12 was the app's error, not downtime: Fire I in Umbral Ice at 1:00.2 removes the element, so Enochian drops and the timer restarts at the 1:02 Fire III (xivanalysis: "Astral Fire or Umbral Ice was dropped 1 time"); every later tick moves ~2s and she holds 2, not 3, at the Amplifier. Fixed 2026-10-15 (Fire I in Umbral Ice / Blizzard I in Astral Fire stop the timer), plus deaths after the last cast now reset the gauge (pulls 1 and 19 had ticks after an unraised death). Now 5 of 5 pages match. |
| blm/Gauge/dropped-enochian | wrong | — | (before 7.2) Astral Fire / Umbral Ice timing out | Can't happen from 7.2; pre-7.2 logs aren't judged by `polyglot`. |
| blm/Gauge/overwritten-paradox | candidate | — | a Paradox gained while one is held | Major (the first on 7.2+ forgiven). Header: not built (gauge). |
| blm/Leylines/uptime-pre72 | superseded | `leyLines` | (before 7.2) Circle of Power uptime under 90% of Ley Lines | The per-GCD check runs on every patch. |
| blm/Leylines/casts-72plus | verified | `leyLines` | GCDs cast outside Circle of Power while Ley Lines is up | Built 2026-10-15 for every patch (CoP's speed is the same before 7.2): a GCD with Circle of Power off at its begin-cast and its completion, one finding per Ley Lines, each GCD 15% of an average GCD; in forced or movement time shown, not counted. Matched all five xivanalysis pages' Ley Lines tables (xz1wjC6gfXmkMKYt 6:36 1 of 9; 7zwpcLxk2Fd1h6Vr 4:00 1 of 9, 8:53 2 of 8; r4qDkR9btJCXnKWd Doomtrain pull 6 1:03 1 of 9; Q18Xc93x4wpfMFdT, Y9Fh2BHyj3xAqZ6V pull 3 none). 107 windows across the 57 Black Mage reports on disk, mostly one GCD (6-15k); the worst VrJcQxq4RYPML6Zk 5:08, 8 of 9 (98k). The GCD-gap check doesn't see this: Circle of Power isn't a haste window there. |
| blm/Swiftcast/unused | no-damage | — | Swiftcast unused | Utility. |
| blm/Triplecast/overwritten | no-damage | — | Triplecast pressed with stacks still up | Minor 1, Medium 2, Major 4. Holds (2026-10-15): 3 on disk, each wasting the last stack (wNHvD38WTbFtGJKr Zelenia pull 3 5:22.5, Y9Fh2BHyj3xAqZ6V Zelenia pull 7 3:12.6, zPJaZNfkFAKhY42t 9:19.4). Not adopted: a lost instant costs damage only if movement or a weave later needed it, which the log can't show (the GCD-gap and movement findings carry that cost when it happens). |
| blm/RotationWatchdog/ExpectedFire/despair | unverifiable | — | a fire phase missing Despair | Minor 1, Medium 3, Major 5. Rests on MP, which the app's pull data doesn't carry. |
| blm/RotationWatchdog/ExpectedFire/fire4 | unverifiable | — | a fire phase short of Fire IVs | Display only; MP-based. |
| blm/RotationWatchdog/ExpectedFire/flarestar-count | unverifiable | — | a fire phase without Flare Star | Display only; Astral Soul inferred. |
| blm/RotationWatchdog/FlareStarUsage/suggestion | wrong | — | Flare Star missing | Counts only windows where the player died (inverted test, bug). |
| blm/RotationWatchdog/ManafontTiming/suggestion | unverifiable | — | Manafont before Despair | Minor 1, Medium 2, Major 3. MP-gated. |
| blm/RotationWatchdog/ExtraF1/suggestion | verified | `blmWrongGcds` ("wrong-gcd") | any Fire I | Built 2026-10-15: in Astral Fire her average Fire IV less her average Fire I (the lost Astral Soul / Flare Star needs MP, not valued); in Umbral Ice (drops the element) an average GCD less it. 4 on disk: wNHvD38WTbFtGJKr Zelenia pull 10 2:10.3 (29k, mid fire phase), qh3VDQFy274mNPfJ 6:18.8 (58k, Watery Grave, AF1 with a Firestarter ready), r4qDkR9btJCXnKWd Doomtrain pull 6 1:00.2 (46k, in Umbral Ice), Jv7XZL2zwYgyhdFj 7:45.8 (forced: just raised). Matched xivanalysis on the pull 6 page ("1 Astral Fire phase lost a Flare Star") and the other four pages (none). |
| blm/RotationWatchdog/FirestarterUsage/suggestion-pre72 | candidate | — | (before 7.2) Paradox then a hardcast Fire III | Minor. |
| blm/RotationWatchdog/ColdF3/suggestion | candidate | — | (7.2+) Fire III from Umbral Ice 3 with 3 hearts | Minor 1, Medium 3, Major 5. Inferred gauge. |
| blm/RotationWatchdog/LukewarmF4/suggestion | candidate | — | Fire IV before Astral Fire 3 | Medium 1, Major 2. Inferred gauge. |
| blm/RotationWatchdog/IceMage/suggestion | wrong | — | an ice-only rotation window | Same inverted death test (bug). |
| blm/RotationWatchdog/SkipThunder/suggestion | candidate | — | a Thunder in the last fire phase before downtime / the kill that cost a fire spell | Minor 1, Medium 2, Major 3. |
| blm/RotationWatchdog/UptimeSouls/suggestion | covered | `blmWrongGcds` ("wrong-gcd") | Umbral Soul while the boss is targetable | Built 2026-10-15: an average GCD each, outside forced time (including a GCD that runs into downtime: djChYqt4b7K8aAfP 2:42.6, 0.1s before the bosses left); movement shown, not counted. Fires only on r4qDkR9btJCXnKWd Doomtrain (Laura Razzy, 10 in pulls 10, 12, 14, 15, 18, 19, 65-105k): 2-3s after the boss is back at 2:08.5, and after a hit on Aether at 2:45. xivanalysis agrees on the five pages (none); not yet compared on a pull where it fires. |
| blm/RotationWatchdog/MissedIceParadox/error-code | no-damage | — | — | A note code only. |
| blm/Weaving/too-many-weaves | covered | `checkGcdGaps` | weaves past the limit (1 allowed in some AF3 / UI3 cases) | — |
| blm/Interrupts | verified | `checkInterrupts` | a cancelled cast | 2T1HzdPKgbhM43am 3 matched. |
| blm/AlwaysBeCasting, Death | covered | `checkGcdGaps`, `checkDeaths` | — | Generic. |

## Records

| id | source | trigger / threshold | damage | log-visible | doubts |
|---|---|---|---|---|---|
| blm/DoTs/* | modules/DoTs.tsx:9-77; DoTsCommon.tsx | uptime checklist 95% (7.2+); clipping Minor 6s, Medium 9s, Major 12s a minute | yes | yes | sum of averages; target-blind |
| blm/Thunder/* | modules/Thunder.tsx:20-155 | before 7.2: uptime 95%; clipping past 3s a refresh: Medium, 2× Major | yes | yes | — |
| blm/AoEUsages/* | modules/AoEUsages.ts:4-53 | Foul 3 / 2 (7.2), Flare 3 / 2 (7.1), Thunder IV 2, HT2 2, Blizzard II 3, HB2 3, Fire II 4, HF2 3, Freeze 3: Minor 1, Medium 4, Major 7 | yes | yes | — |
| blm/OGCDDowntime/uses | modules/OGCDDowntime.tsx:4-33 | hold 5s, first use 15s (Manafont 25s); Triplecast before 7.2; checklist 95% | yes | yes | — |
| blm/Procs/* | modules/Procs.tsx:12-65 | Thunderhead / Firestarter dropped: Medium | yes | yes | permanent from 7.2 |
| blm/Gauge/* | modules/Gauge.tsx:122-691 | lost / overwritten Polyglot: Major; dropped Enochian: Medium; overwritten Paradox: Major | yes | no (AF / UI inferred) | death counted as expiry |
| blm/Leylines/* | modules/Leylines.tsx:63-322 | before 7.2: CoP ÷ Ley Lines uptime 90%; 7.2+: casts under CoP 95% | yes | yes | 0% with no Ley Lines |
| blm/Swiftcast/unused | modules/Swiftcast.tsx:11-44 | core: Major at 1 | no | yes | — |
| blm/Triplecast/overwritten | modules/Triplecast.tsx:41-108 | Minor 1, Medium 2, Major 4 | yes | yes | — |
| blm/RotationWatchdog/* | modules/RotationWatchdog.tsx:63-506; RotationWatchdog/*Evaluator.tsx | per fire-phase window: missing Despair / Fire IV / Flare Star, Manafont timing, extra Fire I, cold Fire III, lukewarm Fire IV, ice-only windows, Thunder before downtime, Umbral Soul in uptime | yes | partly (MP and gauge inferred) | inverted death tests |
| blm/Weaving/too-many-weaves | modules/Weaving.tsx:7-51 | core limit, 1 allowed with Transpose / role actions / AF3-UI3 casts: Medium 1, Major 5 | yes | yes | — |

## Open

In priority order (biggest damage cost first).

1. **blm/RotationWatchdog/UptimeSouls** (covered): compare a xivanalysis
   page where it fires, e.g. r4qDkR9btJCXnKWd fight 15 (Doomtrain pull 14,
   Laura Razzy: 2:42.2, 2:47.1).
2. **blm/Gauge/overwritten-paradox, ColdF3, LukewarmF4, SkipThunder**
   (candidates). Gauge-inferred. Laura's pull 6 page has 3 Paradox
   overwrites and 3 cold Fire IIIs to compare against.
3. **MP-based rows** (unverifiable): need MP in the pull data first.
