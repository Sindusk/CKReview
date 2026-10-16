# xivanalysis audit: Machinist

- **Clone:** xivanalysis `f532855e635bdfb4211cec8128d582dadfdc6a75`
  (2026-09-25). Records extracted 2026-10-15 by a Sonnet subagent (batch 2),
  spot-checked (3 of 3 matched their source); reconciled in the main session.
  Sources are relative to `src/parser/jobs/mch/` in the clone.
- **Patch:** one branch: `MultiHitSkills.ts:15` `patch.before('7.3')`,
  Bioblaster's minimum is 2 before 7.3 and 3 from 7.3. Supported 7.0–7.5.
- **App:** `lib/damage/ffxiv/jobs/ranged.ts` (`MCH_CHECKS`: `wildfire`,
  `hypercharge`, `mchAoe`), `tracked-cooldowns.ts` ("Machinist"), generic
  checks. Machinist pulls on disk: jN3XDrf2z8PmLgRJ Vamp Fatale pulls 9
  and 12 (wipes) and three Red Hot and Deep Blue kills fetched
  2026-10-15 (djChYqt4b7K8aAfP, xtcaT8y9CGjpPnHK, yPHmaGTY2btq1wD9). The
  AoE pairs were checked on them; `wildfire` and `hypercharge` haven't
  been. One xivanalysis page: Mika Katsune, jN3XDrf2z8PmLgRJ Vamp
  Fatale pull 12 (FFLogs fight 24), compared for the AoE rows only.
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
| mch/Gauge/heat-overcap | covered | `mchGauges` (gauge-overcap; also a timeline lane) | Heat over 100 | Built 2026-10-15 as Gauge.tsx's simulation from casts (Slug / Clean Shot only when the combo landed; Hypercharge free under Hypercharged). 50 Heat lost is 5 Blazing Shots over 3 combo GCDs. Fires on L9BzKkD2nxcVgHTC Necron pull 20 (Sonder Dreams, 130 Heat: one Hypercharge, the free one, between 2:43 and 6:12; 4k per 5). Awaiting a page. |
| mch/Gauge/battery-overcap | covered | `mchGauges` (gauge-overcap; also a timeline lane) | Battery over 100 | Built 2026-10-15. Lost Battery is worth her Queen damage per Battery spent (pet hits ÷ the Battery her Queens took). 10-20 at a time on 6 pulls: jN3XDrf2z8PmLgRJ Vamp Fatale pulls 9, 11, 12 (Mika Katsune, a Chain Saw at 100 at 2:05 and 4:05 each time; 28-60k), Brk8fQGnhJaxFKvb 6:03, RaM97t3whCZrJBPm 6:26, L9BzKkD2nxcVgHTC Necron pulls 18, 20. Awaiting a page. |
| mch/Reassemble/bad-gcd | covered | `reassemble` (burst-window) | Reassemble on a weak GCD | Built 2026-10-15: (her best of Chain Saw / Excavator / Air Anchor / Drill − that GCD's average) × what a sure crit and direct hit add over her average roll. 449 of 464 Reassembles on disk went on the four; 12 didn't (17-57k), e.g. Brk8fQGnhJaxFKvb 5:27.2 Heated Slug Shot, bWDLM6zVXkqFAfjT 8:37.8 Heated Clean Shot, L9BzKkD2nxcVgHTC Necron pull 18 0:07.5 Blazing Shot. Awaiting a page. |
| mch/Reassemble/dropped | covered | `checkProcs` | Reassemble expiring unused | 3 on disk, all in Red Hot and Deep Blue's 2:47 downtime (forced): RaM97t3whCZrJBPm 2:47.9 (checkProcs fires there), jXG76ba43VDLAvYz 2:47.7, xtcaT8y9CGjpPnHK 2:46.9 (it doesn't: one consumer doesn't dominate). Free in downtime either way. |
| mch/YassQueen/missing-collider | wrong | — | a Queen summon without Crowned Collider | Medium 1, Major 3. Not adopted (2026-10-15): fight-blind. Six Red Hot and Deep Blue Machinists' 1:12-1:18 Queen ends on Pile Bunker with no Collider, the top parse YPhxRTb9Ld7BJaXp included (1:13.8, Pile Bunker 1:28.6): a mechanic, not a mistake. Most others are at the kill. |
| mch/YassQueen/queenless-attack | no-damage | — | — | A broken-log trigger. |
| mch/MultiHitSkills/bioblaster | verified | `mchAoe` (vs Drill, minimum 3, its DoT ticks counted) | Bioblaster on too few targets (2 before 7.3, 3 from 7.3) | Built 2026-10-15. Premise holds (shared charges). The ticks matter: the direct hit is 50 potency (5.3k at pull 9 5:26, ticks ~6.5k each). Fires on jN3XDrf2z8PmLgRJ Vamp Fatale pull 9 5:25 and pull 12 5:10, both on the boss after the adds died (39k, 33k); djChYqt4b7K8aAfP Red Hot and Deep Blue 8:48 on both bosses (27k). The damage comparison covers the pre-7.3 minimum. Matched xivanalysis on Vamp Fatale pull 12 (1 of its 1). |
| mch/MultiHitSkills/auto-crossbow | covered | `mchAoe` (vs Blazing Shot, minimum 4) | Auto Crossbow on under 4 | Not seen firing. xivanalysis counts 5 on pull 12 (all on two targets). Buff-neutral, two targets out-damage Blazing Shot (raw 31-51k against its ~36k average), so none is a loss; the raw comparison had flagged one (5:04, 1k). Its minimum of 4 is stricter than the damage; not adopted. |
| mch/MultiHitSkills/scattergun | covered | `mchAoe` (vs the Heated combo's average, minimum 4) | Scattergun on under 4 | Fires on pull 12 5:00 (two, 11k); on three it passes. xivanalysis counts 2 on pull 12: 5:00 matches; 5:18 hit three for 40k against the combo's ~34k average, not a loss (not adopted). |
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

1. **Compare pages** for the 2026-10-15 builds and `wildfire` /
   `hypercharge`: https://xivanalysis.com/fflogs/L9BzKkD2nxcVgHTC/20
   (Sonder Dreams: Heat, Battery, 2 Reassembles),
   https://xivanalysis.com/fflogs/jN3XDrf2z8PmLgRJ/21 (Mika Katsune:
   Battery), https://xivanalysis.com/fflogs/Brk8fQGnhJaxFKvb/12 (Dra
   Nakyuek: Battery, Reassemble on Heated Slug Shot).
2. **Double Check / Checkmate** charges (needs a charge simulation with
   Heat Blast / Blazing Shot refunds), **Wildfire fizzle**.
3. **mch/MultiHitSkills/auto-crossbow** (covered). Not seen firing: two
   targets aren't a loss.
