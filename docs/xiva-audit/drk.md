# xivanalysis audit: Dark Knight

- **Clone:** xivanalysis `f532855e635bdfb4211cec8128d582dadfdc6a75`
  (2026-09-25). Records extracted 2026-10-15 by a Sonnet subagent (batch 1),
  spot-checked (3 of 3 matched their source); reconciled in the main session.
  Sources are relative to `src/parser/` in the clone.
- **Patch:** no patch branches in `jobs/drk`; supported 7.0–7.5.
- **App:** `lib/damage/ffxiv/jobs/drk.ts` (header, `DRK_CHECKS`:
  `delirium`, `darkside`, `blood`, `aoeCombo`, `livingShadow`,
  `saltAndDarkness`), `tracked-cooldowns.ts` ("Dark Knight"), generic
  checks. Case studies: 2T1HzdPKgbhM43am, dDar482XvFKBPJYh FRU,
  qjCMx4bRfgNKwX9T Dancing Mad.

## Ledger

| id | status | app check | fires-on | notes |
|---|---|---|---|---|
| drk/Darkside/uptime | verified | `darkside` (simulated) | Darkside lapsing | Checklist 99%. Matched on qjCMx4bRfgNKwX9T. Not in FFLogs' multiplier, so both tools simulate it. |
| drk/Darkside/drop-table | no-damage | — | — | Table only. |
| drk/BloodGauge/overcap | verified | `blood` | Blood over 100 | Minor 50, Medium 100, Major 200. 2T1HzdPKgbhM43am 60 matched. |
| drk/MPUsage/blackest-night-dark-arts | candidate | — | The Blackest Night not breaking, or a Dark Arts overwritten by another break | Medium 1, Major 2. A lost Dark Arts is a free Edge of Shadow. The log shows the shield's removal with what was left, so it's checkable. A shield that doesn't break is mitigation planning (no damage); only the overwrite costs damage. |
| drk/MPUsage/wasted-mp | candidate | — | MP over the cap (3000 = one Edge of Shadow) | 2T1HzdPKgbhM43am: one Edge of Shadow's worth, not built. MP regen is inferred; MP fills in downtime, which needs excusing. |
| drk/SaltAndDarkness/unused | verified | `saltAndDarkness` | Salted Earth with no Salt and Darkness | qjCMx4bRfgNKwX9T 7:36 built from it. |
| drk/SaltAndDarkness/failed | covered | `noDamageCasts` | Salt and Darkness hitting nothing | Its count goes negative on multi-target hits, so it under-reports. |
| drk/MultiHitSkills/flood-of-shadow | candidate | — | Flood of Shadow on under 3 targets | `aoeCombo` pairs only Unleash / Hard Slash and Stalwart Soul / Syphon Strike, at the one-target minimum. Flood vs Edge of Shadow is the common case (same MP). |
| drk/MultiHitSkills/quietus | candidate | — | Quietus on under 3 targets | vs Bloodspiller. |
| drk/MultiHitSkills/impalement | candidate | — | Impalement on under 3 targets | The Delirium window accepts Impalements in place of the single-target GCDs; this catches them on one target. |
| drk/MultiHitSkills/abyssal-drain | candidate | — | Abyssal Drain on under 3 targets | vs Carve and Spit (shared recast). |
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

1. **drk/MultiHitSkills/flood-of-shadow, quietus, impalement,
   abyssal-drain** (candidates). Add the pairs (minimum 3) to `aoeCombo`;
   Flood of Shadow first. Check on a pull with adds.
2. **drk/MPUsage/blackest-night-dark-arts** (candidate). Only the
   overwrite costs damage (a lost Edge of Shadow).
3. **drk/MPUsage/wasted-mp** (candidate). Needs an MP simulation with
   downtime excused.
