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
| blm/AoEUsages/foul | verified | `blmAoe` (vs Xenoglossy) | Foul on too few targets | The app flags one target only: right from 7.2 (minimum 2); before 7.2 xivanalysis needs 3. A killing blow on its only target isn't counted (2026-10-15, shared.ts: the fatal hit's healthAfter is 0): djChYqt4b7K8aAfP 9:47.5, a 5k Foul finishing Red Hot, read as 128k. With it gone, djChYqt4b7K8aAfP fight 3 matches xivanalysis's 6 (2 Foul, 3 Flare, 1 High Blizzard II). |
| blm/AoEUsages/flare | verified | `blmAoe` (vs Fire IV) | Flare on too few targets | Same: right from 7.1. 7yXZbmqcrCga8PHz matched xivanalysis (3 of 3) once a bug was fixed (2026-10-15): two back-to-back Flares (7:43, 7:45) read as one, the second taking the first's in-flight hit. |
| blm/AoEUsages/freeze | verified | `blmAoe` (minimum 3) | Freeze on under 3 | 2T1HzdPKgbhM43am 7:55, 8:15 matched. 7yXZbmqcrCga8PHz: 3 of 3 with the buff-neutral comparison (2026-10-15); the raw one passed the 5:33 Freeze (52k against Blizzard IV's 50k average). VrJcQxq4RYPML6Zk fight 6: xivanalysis 5 (1 Foul, 1 Flare, 3 Freezes on 2), the app had 2. Her 1:28.8 Blizzard IV hit nothing yet counted in the average it's judged against, which then sat level with Freeze on two. Fixed 2026-10-15 in shared.ts (the single-target average counts only casts that landed): 5 of 5. That raised AoE values 5-30% across every job (casts into invulnerability or past the kill no longer dilute the average) and added a few small findings (zPJaZNfkFAKhY42t Foul 9:37, 8k; 1-4k Viper and Monk ones). |
| blm/AoEUsages/high-fire-ii | verified | `blmAoe` (vs Fire III / Fire IV, minimum 3) | High Fire II on under 3 | Built 2026-10-15. Fires on 7yXZbmqcrCga8PHz Red Hot and Deep Blue 9:27 (both bosses, 65k). Matched xivanalysis there (1 of 1), with Foul 1/1. |
| blm/AoEUsages/high-blizzard-ii | verified | `blmAoe` (vs Blizzard III, minimum 3) | High Blizzard II on under 3 | Two targets clearly lose: ~9.5k a target against Blizzard III's ~45k. Fires on 7yXZbmqcrCga8PHz 5:29, 9:22, 9:50, djChYqt4b7K8aAfP 7:40, q4mQCNpRKwH1PZjb 9:04 (both bosses, 17-26k), xtcaT8y9CGjpPnHK 5:40 (Watery Grave alone, 21k). Matched xivanalysis on 7yXZbmqcrCga8PHz (3 of 3). |
| blm/AoEUsages/high-thunder-ii | covered | `blmAoe` (vs High Thunder, one target; direct hits only) | High Thunder II on one target | Fires on q4mQCNpRKwH1PZjb 6:53, 7:44, 9:18 (one boss with the two apart, 4-8k). The DoT difference isn't valued. |
| blm/AoEUsages/thunder-iv, blizzard-ii, fire-ii | wrong | — | — | Replaced at level 82+; can't occur at 100. |
| blm/OGCDDowntime/uses | covered | `checkCooldownDrift` (hold 5s, first use 15s / Manafont 25s) | Ley Lines, Manafont, Amplifier (and Triplecast before 7.2) held | The app tracks Triplecast on every patch; xivanalysis drops it from 7.2. Ley Lines has one charge before 7.1 (`recastOnPatches`, 2026-10-16). Valued 2026-10-16: Ley Lines at 15% of what the player dealt inside Circle of Power in an average window (`leyLinesValue`; 7 on disk, 91-295k, e.g. VrJcQxq4RYPML6Zk, zPJaZNfkFAKhY42t); Amplifier (Xenoglossy − Fire IV) is skipped below level 86 (`minLevel`): TEA's Black Mage read as 1-3 Amplifiers lost on all 30 pulls. Manafont and Triplecast stay unvalued (an extra Astral Fire phase; instant casts worth something only with movement). No xivanalysis page compared yet. |
| blm/Procs/dropped-thunderhead | covered | `checkProcs` | Thunderhead expiring | Before 7.2 only (permanent from 7.2). |
| blm/Procs/dropped-firestarter | covered | `checkProcs` | Firestarter expiring | Same. |
| blm/Procs/overwritten-and-invuln-table | no-damage | — | — | Table only. |
| blm/Gauge/lost-polyglot | superseded | `polyglot` (death resets) | the Polyglot timer stopping (Enochian dropped) | From 7.2 Astral Fire / Umbral Ice never time out, so Enochian only drops on a death; the gauge simulation resets there, and the death finding carries the cost. |
| blm/Gauge/overwritten-polyglot | verified | `polyglot` | a Polyglot gained at the cap | Built 2026-10-15 as a gauge simulation from casts (gaugeFindings): Enochian from the first fire or ice spell, +1 every 30s, +1 per Amplifier, −1 per Xenoglossy / Foul, cap 3, reset on death; 7.2+ only. A Polyglot at the cap, or held at a kill (by time held), is her average Xenoglossy over her average GCD. Hand-checked on xz1wjC6gfXmkMKYt (Dester Whitegloomer): Amplifier at 2:05 with 2 held, no spend before the 2:30 tick, a fourth at the cap (66k). Fires on 11 Black Mages on disk, about one each (41-76k). Matched xivanalysis's "Xenoglossy got overwritten" (2026-10-15) on xz1wjC6gfXmkMKYt 1, Q18Xc93x4wpfMFdT 2, 7zwpcLxk2Fd1h6Vr 1, Y9Fh2BHyj3xAqZ6V Zelenia pull 3 1 (its "2 Polyglot stacks lost" there is a death). r4qDkR9btJCXnKWd Doomtrain pull 6 (Laura Razzy) 4:12 was the app's error, not downtime: Fire I in Umbral Ice at 1:00.2 removes the element, so Enochian drops and the timer restarts at the 1:02 Fire III (xivanalysis: "Astral Fire or Umbral Ice was dropped 1 time"); every later tick moves ~2s and she holds 2, not 3, at the Amplifier. Fixed 2026-10-15 (Fire I in Umbral Ice / Blizzard I in Astral Fire stop the timer), plus deaths after the last cast now reset the gauge (pulls 1 and 19 had ticks after an unraised death). Now 5 of 5 pages match. |
| blm/Gauge/dropped-enochian | wrong | — | (before 7.2) Astral Fire / Umbral Ice timing out | Can't happen from 7.2; pre-7.2 logs aren't judged by `polyglot`. |
| blm/Gauge/overwritten-paradox | verified | `blmGaugeChecks` (gauge-overcap) | a Paradox gained while one is held | Built 2026-10-15 on the full gauge simulation (`blmGauge`, a port of Gauge.tsx's 7.2+ branch; no Paradox cast on disk lacks a marker in it). The pull's first forgiven like xivanalysis's (the opener's); each other one is her average Paradox less her average rotation GCD (Xenoglossy, Foul, High Thunder left out: they come with time, not cycles), floored at 0 and still listed. That is usually small (0-9k): Paradox is unaspected and about an average GCD; its Firestarter's worth shows as a cold Fire III when it's missed. Against Fire IV instead, djChYqt4b7K8aAfP's two read as nothing and were dropped. Matched xivanalysis by count and time: r4qDkR9btJCXnKWd Doomtrain pull 6 1:58.9, 3:16.8, 4:12.0 (its 1:58, 3:16, 4:11), pull 14 4:16.0 (4:15), djChYqt4b7K8aAfP fight 3 2:41.4, 3:54.5 (2:40, 3:53), VrJcQxq4RYPML6Zk fight 6 1 (1), qh3VDQFy274mNPfJ none (its only one is the first). |
| blm/Leylines/uptime-pre72 | superseded | `leyLines` | (before 7.2) Circle of Power uptime under 90% of Ley Lines | The per-GCD check runs on every patch. |
| blm/Leylines/casts-72plus | verified | `leyLines` | GCDs cast outside Circle of Power while Ley Lines is up | Built 2026-10-15 for every patch (CoP's speed is the same before 7.2): a GCD with Circle of Power off at its begin-cast and its completion, one finding per Ley Lines, each GCD 15% of an average GCD; in forced or movement time shown, not counted. Matched all five xivanalysis pages' Ley Lines tables (xz1wjC6gfXmkMKYt 6:36 1 of 9; 7zwpcLxk2Fd1h6Vr 4:00 1 of 9, 8:53 2 of 8; r4qDkR9btJCXnKWd Doomtrain pull 6 1:03 1 of 9; Q18Xc93x4wpfMFdT, Y9Fh2BHyj3xAqZ6V pull 3 none), then three more where it fires (2026-10-15): qh3VDQFy274mNPfJ fight 22 (Eva Elder) 4:22 4 of 9, 6:54 3 of 9, 8:49 4 of 7; wNHvD38WTbFtGJKr fight 11 6:43 1 of 10; r4qDkR9btJCXnKWd fight 15 1:03 1 of 10. 107 windows across the 57 Black Mage reports on disk, mostly one GCD (6-15k); the worst VrJcQxq4RYPML6Zk 5:08, 8 of 9 (98k). The GCD-gap check doesn't see this: Circle of Power isn't a haste window there. |
| blm/Swiftcast/unused | no-damage | — | Swiftcast unused | Utility. |
| blm/Triplecast/overwritten | no-damage | — | Triplecast pressed with stacks still up | Minor 1, Medium 2, Major 4. Holds (2026-10-15): 3 on disk, each wasting the last stack (wNHvD38WTbFtGJKr Zelenia pull 3 5:22.5, Y9Fh2BHyj3xAqZ6V Zelenia pull 7 3:12.6, zPJaZNfkFAKhY42t 9:19.4). Not adopted: a lost instant costs damage only if movement or a weave later needed it, which the log can't show (the GCD-gap and movement findings carry that cost when it happens). |
| blm/RotationWatchdog/ExpectedFire/despair | covered | `blmGaugeChecks` ("Despair skipped") | a fire phase missing Despair | Minor 1, Medium 3, Major 5. Built 2026-10-16 from the logged MP (`PlayerEvent.mp`, before the cast's cost; Manafont's own event shows the refill): a cast leaving Astral Fire with 800+ MP and no Despair since the phase began or the last Manafont, unless the next spell re-enters Astral Fire before any ice spell (7zwpcLxk2Fd1h6Vr 2:06.1 Transpose then a Firestarter Fire III; 8:40.9 Blizzard III at 10000 then Transpose back at full). Despair less her average rotation GCD. Downtime within a GCD of the exit, or a death in the phase: forced. Differs from xivanalysis, which expects one Despair per phase however Manafont split it; Dawntrail's line has one each side (after Manafont's six Fire IVs 2800 MP remain). 9 on the 9 MP pulls re-fetched 2026-10-16, 5 forced (downtime: r4qDkR9btJCXnKWd pulls 6 and 14 at 3:44 / 3:47, Q18Xc93x4wpfMFdT 2:44.7, xz1wjC6gfXmkMKYt 1:49.4; 2T1HzdPKgbhM43am's P3 hold). Counted: r4qDkR9btJCXnKWd Doomtrain pull 6 3:16.8 (Blizzard III at 2800 after the Manafont half, 14k), qh3VDQFy274mNPfJ 6:25.7 (1500) and 9:49.5 (3200, 8s before the kill), q4mQCNpRKwH1PZjb 6:45.0 (1200). Against xivanalysis 2026-10-16 on r4qDkR9btJCXnKWd pull 6 (Laura Razzy): it counts 1, the 3:25-3:44 phase (Transpose at 4400 MP), which the app calls forced: nothing landed on the boss after 3:42.0 and the last Fire IV was 3:40.95, so the next GCD (~3:43.3) had no target; its count is fight-blind there. It doesn't count the app's 3:16.8 (2800 MP after Manafont's Fire IVs), expecting one Despair per ice-to-ice window however Manafont splits it; the MP says one more fit. Its starting-phase table otherwise agrees (12/12 Fire IVs, 2 Flare Stars in the 1:58 window). |
| blm/RotationWatchdog/ExpectedFire/fire4 | unverifiable | — | a fire phase short of Fire IVs | Display only in xivanalysis; the lost Astral Soul is a Flare Star, which needs the MP model per heart. Not built. |
| blm/RotationWatchdog/ExpectedFire/flarestar-count | unverifiable | — | a fire phase without Flare Star | Display only; Astral Soul inferred. |
| blm/RotationWatchdog/FlareStarUsage/suggestion | wrong | — | Flare Star missing | Counts only windows where the player died (inverted test, bug). |
| blm/RotationWatchdog/ManafontTiming/suggestion | candidate | — | Manafont before Despair | Minor 1, Medium 2, Major 3. MP-gated. Checked 2026-10-16 on the 9 pulls with MP: every Manafont in Astral Fire came at 0 MP (after Despair, Flare Star or Xenoglossy at 0). Not built: never seen. |
| blm/RotationWatchdog/ExtraF1/suggestion | verified | `blmWrongGcds` ("wrong-gcd") | any Fire I | Built 2026-10-15: in Astral Fire her average Fire IV less her average Fire I (the lost Astral Soul / Flare Star needs MP, not valued); in Umbral Ice (drops the element) an average GCD less it. 4 on disk: wNHvD38WTbFtGJKr Zelenia pull 10 2:10.3 (29k, mid fire phase), qh3VDQFy274mNPfJ 6:18.8 (58k, Watery Grave, AF1 with a Firestarter ready), r4qDkR9btJCXnKWd Doomtrain pull 6 1:00.2 (46k, in Umbral Ice), Jv7XZL2zwYgyhdFj 7:45.8 (forced: just raised). Matched xivanalysis on the pull 6 page ("1 Astral Fire phase lost a Flare Star"), the other four pages (none), and both other firing pulls (wNHvD38WTbFtGJKr fight 11, qh3VDQFy274mNPfJ fight 22: 1 each). |
| blm/RotationWatchdog/FirestarterUsage/suggestion-pre72 | candidate | — | (before 7.2) Paradox then a hardcast Fire III | Minor. |
| blm/RotationWatchdog/ColdF3/suggestion | verified | `blmGaugeChecks` ("wrong-gcd") | (7.2+) Fire III from Umbral Ice 3 with 3 hearts | Built 2026-10-15, measured: her buff-neutral average Fire III from Astral Fire less this one's, at its buffs (about half: r4qDkR9btJCXnKWd pull 6 30k against 63k). Matched xivanalysis: pull 6 1:29.7, 2:13.6, 4:12.0 (its "3 phases"), wNHvD38WTbFtGJKr fight 11 6:48.1 (1), none on pull 14 and qh3VDQFy274mNPfJ. 30 across the samples. |
| blm/RotationWatchdog/LukewarmF4/suggestion | verified | `blmGaugeChecks` ("wrong-gcd") | Fire IV before Astral Fire 3 | Built 2026-10-15, measured against her Fire IV at AF3. Matched xivanalysis on djChYqt4b7K8aAfP fight 3 and VrJcQxq4RYPML6Zk fight 6 (1 phase each). 4 on disk: djChYqt4b7K8aAfP 1:33.9 (16k, AF1 after Transpose + Paradox with the Firestarter unused, before a Flare), VrJcQxq4RYPML6Zk 9:12.4, 9:16.1 (22k, 15k), JZ1KXhDbqkNH3jxR pull 12 8:17.6 (1k). |
| blm/RotationWatchdog/IceMage/suggestion | wrong | — | an ice-only rotation window | Same inverted death test (bug). |
| blm/RotationWatchdog/SkipThunder/suggestion | superseded | `highThunder` (dot-clip) | a Thunder in the last fire phase before downtime / the kill that cost a fire spell | Minor 1, Medium 2, Major 3. The app values every High Thunder against a Fire IV, counting only the ticks it added before the enemy died or left (r4qDkR9btJCXnKWd: "added 27k (2 new ticks), less than a Fire IV: it came off Doomtrain 20.2s before it ran out"). xivanalysis needs MP-based phase expectations for the same call. |
| blm/RotationWatchdog/UptimeSouls/suggestion | verified | `blmWrongGcds` ("wrong-gcd") | Umbral Soul while the boss is targetable | Built 2026-10-15: an average GCD each, outside forced time (including a GCD that runs into downtime: djChYqt4b7K8aAfP 2:42.6, 0.1s before the bosses left); movement shown, not counted. Fires only on r4qDkR9btJCXnKWd Doomtrain (Laura Razzy, 10 in pulls 10, 12, 14, 15, 18, 19, 65-105k): 2-3s after the boss is back at 2:08.5, and after a hit on Aether at 2:45. xivanalysis agrees on the five pages (none). r4qDkR9btJCXnKWd fight 15 (Doomtrain pull 14): xivanalysis 5, the app 2 (2:42.2, 2:47.1, both matched). Its other 3 are 4:49.1-4:55.2, inside 4:48.9-4:58.2 where nobody in the party lands a hit: xivanalysis only excuses invulnerability, not the untargetable car change, so those aren't adopted. |
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

1. **blm/RotationWatchdog/ExpectedFire/despair** (covered 2026-10-16):
   compared on r4qDkR9btJCXnKWd pull 6; the two counts differ by design
   (see the row). A page where both agree on a phase would settle it:
   qh3VDQFy274mNPfJ (6:25.7, 9:49.5).
2. **blm/RotationWatchdog/ManafontTiming** (candidate): never seen on the
   9 MP pulls; build when a pull shows it. More BLM pulls with MP come with
   any re-fetch (`--refetch`).
