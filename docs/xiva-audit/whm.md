# xivanalysis audit: White Mage

- **Clone:** xivanalysis `f532855e635bdfb4211cec8128d582dadfdc6a75`
  (2026-09-25). Records extracted 2026-10-15 by a Sonnet subagent (batch 3),
  spot-checked (3 of 3 matched their source); reconciled in the main session.
  Sources are relative to `src/parser/jobs/whm/` in the clone.
- **Patch:** only `Lilies.tsx` branches: from 7.4 the Lily and Blood Lily
  gauges start at 3 and the Lily timer waits for the first Afflatus.
  Supported 7.0–7.5.
- **App:** `lib/damage/ffxiv/jobs/healer.ts` (`WHM_CHECKS`: `healGcds`,
  `aoeOnOneTarget`, Dia `dot`, `bloodLily`; Lily and Blood Lily lanes via
  `whmGaugeTracks` in `gauges.ts`), `tracked-cooldowns.ts` ("White Mage":
  Presence of Mind, Assize). Phase 3 (2026-10-16): 88 level-100 White
  Mage pulls on disk scanned, premise checked on the FFLogs top 37 for
  Red Hot and Deep Blue. No xivanalysis page compared yet.

## Ledger

| id | status | app check | fires-on | notes |
|---|---|---|---|---|
| whm/DoTs/uptime | covered | Dia `dot` | Dia off the target | Checklist 95%. |
| whm/DoTs/clipping | superseded | Dia `dot` ("refreshed early", per target) | Dia refreshed early (6s / 9s / 12s a minute) | Target-blind, as for every healer DoT. Rechecked 2026-10-18 on 24C9awg1fKhFjBPt Red Hot and Deep Blue Pull 1 (Lady Ceilia): 242s target-blind (25s a minute, Major), 51s per target (3:05.7, 3:44.4, 5:18.8 on Deep Blue read 22-25s with 0s left on it); the app's finding there: 3:43, 27.6s, 30k. Proposed `wrong`; the user chose `superseded` 2026-10-18, as for Combust. |
| whm/DoTs/applied-into-invuln | superseded | Dia `dot` | Dia shortly before invulnerability | Table only. |
| whm/GlareFlare/dropped-glare-iv | covered | `checkProcs` | Sacred Sight stacks unused (Glare IV) | Medium 1, Major 2. Scanned 2026-10-16 on every level-100 White Mage pull on disk: 2 Sacred Sights lost, both at the player's death (mgTQJjX2nW6ANkP7 8:41, ZVCqpA8DPJgMK2Yr 8:41). Synced ultimates (TEA) have no Glare IV. |
| whm/Lilies/bloodlily-overcap | covered | `bloodLily` | Blood Lily gained at 3 | Built 2026-10-16 as a gauge from casts with Lily and Blood Lily lanes: full at the start from 7.4, empty before (52 of 52 level-100 7.4+ pulls pressed Misery before any Lily; no Misery ever went out under 3); a death empties it. A third of (Misery − Glare III) each. 33 counted on disk, 6 forced. FFLogs top 37: 2. Matched Kai Dazkar's page (fGjA9DKLQbRa2q1k): 4 over the cap here (3 counted, 1 forced) = its "1 Blood Lily did not bloom" (it floors to whole Miseries). |
| whm/Lilies/bloodlily-leftover | verified (pG319BgHTnPJc6Ft Necron pull 3 matches its "1 Blood Lily went unused") | `bloodLily` | 3 Blood Lilies unspent at the end | Built 2026-10-16, kills only, a GCD of unforced time since the third: one Misery. pG319BgHTnPJc6Ft Necron pull 3 (9:38, 185k); 2 shown forced. FFLogs top 37: 1. |
| whm/Lilies/lily-overcap | covered | `lilyOvercap` | Lilies capped with the timer running | Was `no-damage`; the user (2026-10-16): fewer Lilies, fewer Blood Lilies, fewer Miseries. Measured: single-target Misery = 4.00 Glare III (buff-neutral medians, 45 / 1,096 hits), so Lilies spent in place of Glares break even; a Lily gains only in place of a heal GCD the healer cast anyway. Built: a Lily lost at the cap counts (a third of Misery − Glare III) when a later Cure / Medica / Regen, not mostly overheal, went out with no Lily before the gauge next reached 3. 5 counted on disk, 1 forced. Pages: Kai Dazkar (fGjA9DKLQbRa2q1k) xivanalysis 8 lost, the sim 3 (first Afflatus 0:43; at 3 from 2:03 to 3:19), none counted; Eastborn Shadowimage (pG319BgHTnPJc6Ft Necron pull 3) 8, the sim 6, 1 counted (Regen 5:53). The difference in totals isn't reconciled. Movement GCDs a Lily could have covered aren't followed. Cleave (the user, 2026-10-16: Misery hits nearby enemies for 50%): an unpaired Lost Lily is worth a third of what her Miseries dealt to targets beyond the first, measured per pull (0 on one target). 37 counted, 8 forced, all on Red Hot and Deep Blue (~5k each at 0.38 Glares of cleave). |
| whm/Lilies/gcd-heals-instead-of-lily | superseded | `healGcds` | Cure / Medica with Lilies available | Major at 3. The app values each heal GCD by what it did. |
| whm/DivineCaress/dropped | no-damage | — | Divine Grace unused | A shield. |
| whm/OGCDs/checklist | covered | `checkCooldownDrift` (Presence of Mind, Assize) | Presence of Mind / Assize held | xivanalysis's checklist target is 75%. Page 2026-10-16 (fGjA9DKLQbRa2q1k fight 4, Kai Dazkar): Presence of Mind 2 / 5 = the app's 3 lost (3 Glare IV − 3 Glare III a use; its 20% speed isn't counted, so low); Assize 11 / 14 against the app's 2 (whole uses, room 15). Assize added 2026-10-16 with a 10s opener allowance (the FFLogs top 15 press it at 0:01-0:10 and hold 11-45s in all over 13 uses). Fires on 23 pulls on disk (bqmRpGxDvfT8AZc6 3 uses, fGjA9DKLQbRa2q1k 2). Pages: xivanalysis 11/14 on both (3 short), 13/15 on pG319BgHTnPJc6Ft Necron pull 3 (here 1 lost); its x/y counts possible uses its own way, so the counts agree within one. |
| whm/OGCDs/liturgy-of-the-bell | no-damage | — | Liturgy unused | Mitigation / healing. |
| whm/OGCDs/asylum | no-damage | — | — | Healing. |
| whm/OGCDs/aquaveil | no-damage | — | — | Mitigation. |
| whm/OGCDs/divine-benison | no-damage | — | — | Shield. |
| whm/OGCDs/temperance | no-damage | — | — | Mitigation. |
| whm/Tincture/expected-actions | superseded | tincture.ts | burst actions missing under the tincture | — |
| whm/Swiftcast/unused | no-damage | — | Swiftcast unused | Utility. |
| whm/Overheal/checklist | superseded | `healGcds` | overheal over 35% | — |
| whm/Interrupts/cancelled-casts | covered | `checkInterrupts` | a cancelled Glare III / heal | — |
| whm/AlwaysBeCasting/uptime | superseded | `checkGcdGaps` | idle GCD time | — |
| whm/AlwaysBeCasting/gcd-downtime | covered | `checkGcdGaps` | a gap past GCD + 150ms | — |
| whm/Weaving/too-many-weaves | covered | `checkGcdGaps` | triple weaves | — |
| whm/Death/died | covered | `checkDeaths` | a death | — |

Holy / Holy III on one target is checked by `aoeOnOneTarget`; xivanalysis
has no White Mage AoE rule.

## Records

| id | source | trigger / threshold | damage | log-visible | doubts |
|---|---|---|---|---|---|
| whm/DoTs/* | modules/DoTs.tsx:8-54 | uptime checklist 95%; clipping Minor 6s, Medium 9s, Major 12s a minute | yes | yes | target-blind |
| whm/GlareFlare/dropped-glare-iv | modules/GlareFlare.tsx:6-24 | Sacred Sight stacks lost: Medium 1, Major 2 | yes | yes | — |
| whm/Lilies/* | modules/Lilies.tsx:12-182 | Blood Lily overcap: Medium 1, Major 2; leftover: Major; Lily overcap: Medium 1, Major 3; heal GCDs with Lilies: Major 3 | yes / no | no (simulated) | 7.4 start values; downtime not corrected |
| whm/DivineCaress/dropped | modules/DivineCaress.tsx:6-25 | Medium 1, Major 3 | no | yes | — |
| whm/OGCDs/* | modules/oGCDs.tsx:8-87 | checklist 75% (PoM, Assize); unused Liturgy / Asylum / Aquaveil / Temperance: Minor 2, Medium 3; Benison: Minor 8, Medium 12 | yes / no | yes | fight-blind |
| whm/Tincture/expected-actions | modules/Tincture.tsx:9-51 | Minor 1, Medium 2, Major 3 | yes | yes | Medicated has no duration |
| whm/Overheal, Swiftcast, Interrupts, AlwaysBeCasting, Weaving, Death | core | core rules | — | yes | — |

## Open

No candidates left (2026-10-16; 74 reports with a White Mage on disk now).
Blood Lily and Assize compared on three pages the same day.

1. **whm/Lilies/lily-overcap**: xivanalysis's Lily totals ran higher
   than the simulation's (8 vs 3, 8 vs 6). Found 2026-10-16: the sim
   rounded each stretch at 3 down on its own; with the timer paused at
   the cap every second there delays every later Lily, so the paused
   time adds up (xivanalysis: total expired time ÷ 20s). Fixed in
   `lilySim`: Eastborn Shadowimage (pG319BgHTnPJc6Ft pull 3) now 8 = 8.
   Still apart: Kai Dazkar 5 against 8 (no deaths; walked by hand from
   his casts, ~119s at the cap, so its 8 counts time this model doesn't,
   possibly a pre-7.4 start), Chizu Wu 11 against 7 (four deaths;
   xivanalysis empties the gauge at each, the app doesn't, since the log
   can't show it). The counted findings stay paired with heals.
2. **whm/GlareFlare/dropped-glare-iv**: no living loss on disk until
   2026-10-16. Found by ff-probe (6 lowest Vamp Fatale White Mages):
   3HrGydmRZApkCtXz fight 3 (Chizu Wu, fetched) let Sacred Sight run out
   at 4:56.8 (1 stack) and 7:14.1 (3 stacks), no death beside either;
   r9RxNhcgqa7BQMYD fight 2 one at 2:37.3. Both fire; priced since then
   as Glare IV − Glare III a stack (`procReplaces`; was the whole Glare
   IV, 191k for the three): 31k and 92k. Matched her page 2026-10-16:
   "dropped 4 procs" = the 1 + 3 stacks; Presence of Mind 4 / 5 = 1;
   Assize 12 / 15 (whole uses, as elsewhere). Its other "dropped 1 proc"
   is a Divine Caress never pressed after the 6:44.7 Temperance (healing,
   not adopted).
