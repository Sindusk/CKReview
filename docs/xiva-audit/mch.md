# xivanalysis audit: Machinist

- **Clone:** xivanalysis `f532855e635bdfb4211cec8128d582dadfdc6a75`
  (2026-09-25). Records extracted 2026-10-15 by a Sonnet subagent (batch 2),
  spot-checked (3 of 3 matched their source); reconciled in the main session.
  Sources are relative to `src/parser/jobs/mch/` in the clone.
- **Patch:** one branch: `MultiHitSkills.ts:15` `patch.before('7.3')`,
  Bioblaster's minimum is 2 before 7.3 and 3 from 7.3. Supported 7.0–7.5.
- **App:** `lib/damage/ffxiv/jobs/ranged.ts` (`MCH_CHECKS`: `wildfire`,
  `hypercharge`), `tracked-cooldowns.ts` ("Machinist"), generic checks.
  **No Machinist sample on disk:** nothing here has fired on a real log,
  so every app row is at most `covered`.
- **xivanalysis quirks found** (from the extraction):
  - `oGCDCharges.tsx:138, 149-152`: a spend at cap starts both Double
    Check's and Checkmate's timers, and the refund hook matches Heat Blast
    but not Blazing Shot, so both overcap counts are unreliable.
  - `GeneralCDDowntime.tsx:3-4`: a 100ms "GCD" allowance (unit mix-up in
    the name; the value is ms).
  - `Reassemble.tsx`: Full Metal Field is in neither list.

## Ledger

| id | status | app check | fires-on | notes |
|---|---|---|---|---|
| mch/Wildfire/gcds | covered | `wildfire` | under 6 weaponskills in Wildfire | Minor 1, Medium 2, Major 3. Valued at the average GCD (unchecked). |
| mch/Wildfire/fizzle | candidate | — | Wildfire dealing 0 | Medium 1, Major 2. Usually the target leaving; premise check. |
| mch/Hypercharge/gcd-count | covered | `hypercharge` | under 5 Blazing Shots / Heat Blasts in Overheated | Display only in xivanalysis; the app values each missing one. |
| mch/GeneralCDDowntime/uses | covered | `checkCooldownDrift` | Wildfire, Barrel Stabilizer, Reassemble, Air Anchor, Drill / Bioblaster or Chain Saw held | Checklist 95%. Same groups and offsets. |
| mch/Drift/gcd-drift | superseded | `checkCooldownDrift` | Air Anchor / Drill / Chain Saw drifting | A table only. |
| mch/OGCDCharges/double-check-overcap | candidate | — | Double Check at 3 charges | Minor 2, Medium 3, Major 4. Left out of the drift check because Heat Blast / Blazing Shot refund 15s; needs a charge simulation with refunds. xivanalysis's own count is unreliable (bug). |
| mch/OGCDCharges/checkmate-overcap | candidate | — | Checkmate at 3 charges | Same. |
| mch/Gauge/heat-overcap | candidate | — | Heat over 100 | Minor 10, Medium 30, Major 50. Inferred from combo GCDs; a lost Hypercharge per 50. |
| mch/Gauge/battery-overcap | candidate | — | Battery over 100 | Minor 10, Medium 20, Major 30. A lost Queen's worth. |
| mch/Reassemble/bad-gcd | candidate | — | Reassemble on a weak GCD | Minor 1, Medium 2, Major 3. Like Dragoon's Life Surge: a forced crit + DH spent on a low hit. |
| mch/Reassemble/dropped | candidate | — | Reassemble expiring unused | Medium 1, Major 2. `checkProcs` may see it if one consumer dominates; unchecked. |
| mch/YassQueen/missing-collider | candidate | — | a Queen summon without Crowned Collider | Medium 1, Major 3. No end-of-pull or downtime allowance in xivanalysis. |
| mch/YassQueen/queenless-attack | no-damage | — | — | A broken-log trigger. |
| mch/MultiHitSkills/bioblaster | candidate | — | Bioblaster on too few targets (2 before 7.3, 3 from 7.3) | The app has no Machinist AoE check. Bioblaster also spends a Drill charge. |
| mch/MultiHitSkills/auto-crossbow | candidate | — | Auto Crossbow on under 4 | vs Blazing Shot. |
| mch/MultiHitSkills/scattergun | candidate | — | Scattergun on under 4 | vs the single-target combo. |
| mch/Tincture/tracked-actions | superseded | tincture.ts | 4 burst actions missing under the tincture | — |
| mch/Tincture/blazing-shot | superseded | tincture.ts | under 10 Blazing Shots under the tincture | — |
| mch/Combos/broken | covered | `checkCombos` | a broken combo | Generic. |
| mch/Weaving/too-many | covered | `checkGcdGaps` | triple weaves | Overheated GCDs are 1.5s; Auto Crossbow has no recast in its data. |
| mch/AlwaysBeCasting/uptime | superseded | `checkGcdGaps` | idle GCD time | Counts Flamethrower's channel as uptime. Check the app does too before the first Machinist case study. |
| mch/AlwaysBeCasting/gcd-downtime | covered | `checkGcdGaps` | a gap past GCD + 150ms | — |
| mch/Death/died | covered | `checkDeaths` | a death | Generic. |

## Records

| id | source | trigger / threshold | damage | log-visible | doubts |
|---|---|---|---|---|---|
| mch/Wildfire/* | modules/Wildfire.tsx:17-158 | under 6 stacks: Minor 1, Medium 2, Major 3; 0 damage: Medium 1, Major 2 | yes | yes | — |
| mch/Hypercharge/gcd-count | modules/Hypercharge.tsx:17-153 | display: 5 a window | yes | yes | fixed 10s window |
| mch/GeneralCDDowntime/uses | modules/GeneralCDDowntime.tsx:3-56 | six groups with offsets; holds 1.25s / 100ms; checklist 95% | yes | yes | 100ms allowance |
| mch/Drift/gcd-drift | modules/Drift.tsx:15-168 | table: drift past 1.5s | yes | yes | first use judged from the pull |
| mch/OGCDCharges/* | modules/oGCDCharges.tsx:10-203 | charge overcap: Minor 2, Medium 3, Major 4 | yes | no (simulated) | timer / refund bugs |
| mch/Gauge/* | modules/Gauge.tsx:13-80 | Heat lost: Minor 10, Medium 30, Major 50; Battery: Minor 10, Medium 20, Major 30 | yes | no (inferred, start at 0) | — |
| mch/Reassemble/* | modules/Reassemble.tsx:12-120 | bad GCD: Minor 1, Medium 2, Major 3; dropped: Medium 1, Major 2 | yes | yes | Full Metal Field unlisted |
| mch/YassQueen/* | modules/YassQueen.tsx:11-139 | no Crowned Collider: Medium 1, Major 3 | yes | yes | — |
| mch/MultiHitSkills/* | modules/MultiHitSkills.ts:4-24 | Bioblaster 2 / 3 (7.3), Auto Crossbow 4, Scattergun 4: Minor 1, Medium 4, Major 7 | yes | yes | — |
| mch/Tincture/* | modules/Tincture.tsx:10-132 | 4 actions: Minor 2, Medium 4, Major 6; Blazing Shots: Minor 1, Medium 2 | yes | yes | Medicated has no duration |
| mch/AlwaysBeCasting/uptime | modules/AlwaysBeCasting.ts:12-87 | uptime with Flamethrower's channel added: 98% | yes | yes | any action ends the channel |

## Open

1. **Get a Machinist sample** (a kill with a Machinist, plus the player's
   xivanalysis page) before building anything here; `wildfire` and
   `hypercharge` have never run on a real log.
2. Then, by likely cost: **Reassemble** (bad GCD, dropped), **Queen**
   without Collider, **Heat / Battery** overcap, **Double Check /
   Checkmate** charges (needs refunds), the three **AoE** pairs,
   **Wildfire fizzle**.
