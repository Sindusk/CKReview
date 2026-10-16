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
| whm/DoTs/clipping | wrong | — | Dia refreshed early (6s / 9s / 12s a minute) | Target-blind, as for every healer DoT. |
| whm/DoTs/applied-into-invuln | superseded | Dia `dot` | Dia shortly before invulnerability | Table only. |
| whm/GlareFlare/dropped-glare-iv | covered | `checkProcs` | Sacred Sight stacks unused (Glare IV) | Medium 1, Major 2. Scanned 2026-10-16 on every level-100 White Mage pull on disk: 2 Sacred Sights lost, both at the player's death (mgTQJjX2nW6ANkP7 8:41, ZVCqpA8DPJgMK2Yr 8:41). Synced ultimates (TEA) have no Glare IV. |
| whm/Lilies/bloodlily-overcap | covered | `bloodLily` | Blood Lily gained at 3 | Built 2026-10-16 as a gauge from casts with Lily and Blood Lily lanes: full at the start from 7.4, empty before (52 of 52 level-100 7.4+ pulls pressed Misery before any Lily; no Misery ever went out under 3); a death empties it. A third of (Misery − Glare III) each. 33 counted on disk, 6 forced. FFLogs top 37: 2. No xivanalysis page yet. |
| whm/Lilies/bloodlily-leftover | covered | `bloodLily` | 3 Blood Lilies unspent at the end | Built 2026-10-16, kills only, a GCD of unforced time since the third: one Misery. pG319BgHTnPJc6Ft Necron pull 3 (9:38, 185k); 2 shown forced. FFLogs top 37: 1. |
| whm/Lilies/lily-overcap | no-damage | — | Lilies capped with the timer running | Medium 1, Major 3. A lost heal, and indirectly a slower Misery. |
| whm/Lilies/gcd-heals-instead-of-lily | superseded | `healGcds` | Cure / Medica with Lilies available | Major at 3. The app values each heal GCD by what it did. |
| whm/DivineCaress/dropped | no-damage | — | Divine Grace unused | A shield. |
| whm/OGCDs/checklist | covered | `checkCooldownDrift` (Presence of Mind, Assize) | Presence of Mind / Assize held | xivanalysis's checklist target is 75%. Assize added 2026-10-16 with a 10s opener allowance (the FFLogs top 15 press it at 0:01-0:10 and hold 11-45s in all over 13 uses). Fires on 23 pulls on disk (bqmRpGxDvfT8AZc6 3 uses, fGjA9DKLQbRa2q1k 2). No xivanalysis page yet. |
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
Waiting on xivanalysis pages:

1. **whm/Lilies/bloodlily-***: fGjA9DKLQbRa2q1k (Kai Dazkar, 3 counted),
   pG319BgHTnPJc6Ft Necron pull 3 (Eastborn Shadowimage, 7.3, Misery held
   at the kill).
2. **whm/OGCDs/checklist, Assize**: bqmRpGxDvfT8AZc6 (Caramel Tiramisu),
   fGjA9DKLQbRa2q1k.
3. **whm/GlareFlare/dropped-glare-iv**: no living loss on disk.
