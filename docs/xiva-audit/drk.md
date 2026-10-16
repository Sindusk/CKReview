# xivanalysis audit: Dark Knight

- **Clone:** xivanalysis `f532855e635bdfb4211cec8128d582dadfdc6a75`
  (2026-09-25). Records extracted 2026-10-15 by a Sonnet subagent (batch 1),
  spot-checked (3 of 3 matched their source); reconciled in the main session.
  Sources are relative to `src/parser/` in the clone.
- **Patch:** no patch branches in `jobs/drk`; supported 7.0–7.5.
- **App:** `lib/damage/ffxiv/jobs/drk.ts` (header, `DRK_CHECKS`:
  `delirium`, `darkside`, `blood`, `aoeCombo`, `livingShadow`,
  `saltAndDarkness`, `darkArtsOverwrite`), `tracked-cooldowns.ts` ("Dark Knight"), generic
  checks. Case studies: 2T1HzdPKgbhM43am, dDar482XvFKBPJYh FRU,
  qjCMx4bRfgNKwX9T Dancing Mad.

## Ledger

| id | status | app check | fires-on | notes |
|---|---|---|---|---|
| drk/Darkside/uptime | verified | `darkside` (simulated) | Darkside lapsing | Checklist 99%. Matched on qjCMx4bRfgNKwX9T. Not in FFLogs' multiplier, so both tools simulate it. |
| drk/Darkside/drop-table | no-damage | — | — | Table only. |
| drk/BloodGauge/overcap | verified | `blood` | Blood over 100 | Minor 50, Medium 100, Major 200. 2T1HzdPKgbhM43am 60 matched. |
| drk/MPUsage/blackest-night-dark-arts | covered | `darkArtsOverwrite` | The Blackest Night not breaking, or a Dark Arts overwritten by another break | Built 2026-10-16 for the overwrite: breaks read from the healing stream (the shield's "removebuff" at an absorb's instant; neither status is in the buff stream), her average Edge of Shadow each. 11 counted on disk, 2 forced (rgTafHJ9MN47m3Vy Doomtrain pull 4: broke ~3:11, the 3:22 TBN broke at 3:24 before the 3:25.8 Edge). FFLogs top 38: 1 in 226 breaks. A shield that doesn't break isn't counted (126 of 1,058 on disk, 15 of 241 among the top 38: a mitigation call; its cost is MP). No xivanalysis page yet. |
| drk/MPUsage/wasted-mp | unverifiable | — | MP over the cap (3000 = one Edge of Shadow) | 2T1HzdPKgbhM43am: one Edge of Shadow's worth, not built. xivanalysis reads MP from the log (actorUpdate). FFLogs does give the player's MP on each cast (`sourceResources.mp`), but the sample fetch drops it (`scripts/lib/slim-report.js` keeps target resources only) and the live transform doesn't map it. Keeping it is a pipeline change plus re-fetching the Dark Knight samples (2026-10-16, asked the user). |
| drk/SaltAndDarkness/unused | verified | `saltAndDarkness` | Salted Earth with no Salt and Darkness | qjCMx4bRfgNKwX9T 7:36 built from it. |
| drk/SaltAndDarkness/failed | covered | `noDamageCasts` | Salt and Darkness hitting nothing | Its count goes negative on multi-target hits, so it under-reports. |
| drk/MultiHitSkills/flood-of-shadow | covered | `aoeCombo` (vs Edge of Shadow, minimum 3) | Flood of Shadow on under 3 targets | Built 2026-10-15. Premise holds (same MP). Fires on vFY7kHVWK19ZQ24A Lindwurm II pull 3 0:40 (one target, 21k) and jN3XDrf2z8PmLgRJ Red Hot and Deep Blue pull 13 3:06 (both bosses, still under an Edge, 21k); H9fnVZgPA3krpCzY Lindwurm II pull 11's pre-pull Flood is shown, not counted. No xivanalysis page for these pulls. |
| drk/MultiHitSkills/quietus | covered | `aoeCombo` (vs Bloodspiller, minimum 3) | Quietus on under 3 targets | Fires on AYQm9Kd8Ct4FxcGp Lindwurm pull 24 4:51 (one target, 34k). |
| drk/MultiHitSkills/impalement | covered | `aoeCombo` (vs the Delirium combo's average, minimum 3) | Impalement on under 3 targets | Fires on Red Hot and Deep Blue kills, both bosses: djChYqt4b7K8aAfP 9:38-9:43 (1-21k: two is close to the combo), VrJcQxq4RYPML6Zk 6:38 (6k). |
| drk/MultiHitSkills/abyssal-drain | verified | `aoeCombo` (vs Carve and Spit, minimum 3) | Abyssal Drain on under 3 targets | Fires on jN3XDrf2z8PmLgRJ Red Hot and Deep Blue pull 44 4:19 (one boss, the two apart and both targetable). Matched xivanalysis there (FFLogs fight 58): 1 of 1. |
| drk/MultiHitSkills/unleash | covered | `aoeCombo` | Unleash on too few targets | The app flags only one-target hits; xivanalysis needs 3. 2T1HzdPKgbhM43am 6:20 and 14:22 were past HP checks (forced). |
| drk/OGCDDowntime/uses | verified | `checkCooldownDrift` | Delirium, Salted Earth, Carve and Spit, Shadowbringer or Living Shadow held | Same groups and offsets. Matched on qjCMx4bRfgNKwX9T. |
| drk/Delirium/expected-gcds | verified | `delirium` | under 3 Delirium GCDs (Impalements allowed) | Matched on qjCMx4bRfgNKwX9T. |
| drk/BloodWeapon/expected-gcds | wrong | — | under 3 GCDs in Blood Weapon | The module is never loaded (not in `modules/index.ts`), so it can't fire. |
| drk/EsteemWindow/full-damage | verified | `livingShadow` | a Living Shadow summon losing one of Esteem's actions | FRU 6:11 (Esteem on the P2 crystals) matched; matched on qjCMx4bRfgNKwX9T. The app matches slots by time from the pet's hits. |
| drk/DarkArtsLost/table | no-damage | — | — | The table behind the Dark Arts rule. |
| drk/Tincture/expected-actions | superseded | tincture.ts | the burst actions missing under the tincture | qjCMx4bRfgNKwX9T "7 missed": the 13:01 tincture was in a one-minute burst (a fourth tincture's price); 18:01 followed the 17:20 death. |
| drk/AlwaysBeCasting/uptime | superseded | `checkGcdGaps` | idle GCD time | Matched. |
| drk/Weaving/too-many | covered | `checkGcdGaps` | triple weaves | qjCMx4bRfgNKwX9T's 4 delayed the GCD by 0.03-0.10s each; the app counts them as small delays. |
| drk/Combos/broken | covered | `checkCombos` | a broken combo | Generic. |
| drk/Death/died | verified | `checkDeaths` | a death | qjCMx4bRfgNKwX9T 17:20 matched. |
| drk/Defensives/use-table | no-damage | — | — | Mitigation. |

Core modules that can't fire for Dark Knight: DoTs, Positionals, Procs (no
proc list), Swiftcast, Lucid, Overheal, Interrupts.

## Records

| id | source | trigger / threshold | damage | log-visible | doubts |
|---|---|---|---|---|---|
| drk/Darkside/uptime | drk/modules/Darkside.tsx:17-90 | timer (max 60s, +30s per Edge / Flood hit) expired time ÷ (pull − downtime): checklist 99%; 2.5s forgiveness at pull start | yes | no (simulated) | — |
| drk/BloodGauge/overcap | drk/modules/BloodGauge.tsx:13-120 | +20 combo'd Souleater / Stalwart Soul, +10 per GCD under Blood Weapon; overcap: Minor 50, Medium 100, Major 200 | yes | no (inferred) | starts at 0; no death reset |
| drk/MPUsage/blackest-night-dark-arts | drk/modules/MPUsage.tsx:26-29, 97-104, 174-198 | shield removed with some left, or broken while Dark Arts is held: Medium 1, Major 2 | indirect | yes (remaining shield) | another Dark Knight's TBN; TBN on others |
| drk/MPUsage/wasted-mp | MPUsage.tsx:16-72, 141-172, 200-212 | ⌊(generated + regen overcap) ÷ 3000⌋: Medium 1, Major 2 | yes | no (MP inferred) | no downtime or death handling |
| drk/SaltAndDarkness/unused | drk/modules/SaltAndDarkness.tsx:13-65 | Salted Earth casts − Salt and Darkness casts: Medium 1, Major 2 | yes | yes | no end-of-pull allowance |
| drk/SaltAndDarkness/failed | SaltAndDarkness.tsx:46-50, 66-77 | presses − hit events: Medium 1, Major 2 | yes | yes | multi-target hits push it negative |
| drk/MultiHitSkills/* | drk/modules/MultiHitSkills.ts:3-31 | Flood of Shadow, Quietus, Impalement, Abyssal Drain, Unleash under 3: Minor 1, Medium 4, Major 7 | yes | yes | Stalwart Soul not paired |
| drk/OGCDDowntime/uses | drk/modules/OGCDDowntime.ts:5-39 | Delirium 10s, Salted Earth 12.5s, Carve and Spit / Abyssal Drain 17.5s, Shadowbringer 20s, Living Shadow 5s; checklist 95% | yes | yes | phase holds count |
| drk/Delirium/expected-gcds | drk/modules/Delirium.tsx:12-102 | Scarlet Delirium, Comeuppance, Torcleaver (Impalements count in their place): Medium 1, Major 2 | yes | yes | no end-of-pull allowance |
| drk/BloodWeapon/expected-gcds | drk/modules/BloodWeapon.tsx:11-39 | 3 GCDs; never loaded | — | yes | — |
| drk/EsteemWindow/full-damage | drk/modules/EsteemWindow.tsx:15-162; EsteemUsageEvaluator.tsx:8-112 | a summon missing one of Esteem's actions: Medium 1, Major 2 | yes | yes | downtime not excused |
| drk/Tincture/expected-actions | drk/modules/Tincture.tsx:9-72 | Delirium chain 3, Bloodspiller / Quietus 2, Shadowbringer 2, Carve 1, Disesteem 1 ...: Minor 1, Medium 2, Major 3 | yes | yes | no end-of-pull allowance |

## Open

In priority order (biggest damage cost first):

1. **drk/MPUsage/wasted-mp** (unverifiable until player MP is kept from
   the log; see its row).
2. **drk/MPUsage/blackest-night-dark-arts** (covered 2026-10-16): needs a
   xivanalysis page (bVDR2mTL7YGvMxK1 The Tyrant pull 11, q4mQCNpRKwH1PZjb
   Red Hot and Deep Blue).