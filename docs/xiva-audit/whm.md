# xivanalysis audit: White Mage

- **Clone:** xivanalysis `f532855e635bdfb4211cec8128d582dadfdc6a75`
  (2026-09-25). Records extracted 2026-10-15 by a Sonnet subagent (batch 3),
  spot-checked (3 of 3 matched their source); reconciled in the main session.
  Sources are relative to `src/parser/jobs/whm/` in the clone.
- **Patch:** only `Lilies.tsx` branches: from 7.4 the Lily and Blood Lily
  gauges start at 3 and the Lily timer waits for the first Afflatus.
  Supported 7.0–7.5.
- **App:** `lib/damage/ffxiv/jobs/healer.ts` (`WHM_CHECKS`: `healGcds`,
  `aoeOnOneTarget`, Dia `dot`), `tracked-cooldowns.ts` ("White Mage":
  Presence of Mind only). **No White Mage in any sample**, so every app row
  is at most `covered`.

## Ledger

| id | status | app check | fires-on | notes |
|---|---|---|---|---|
| whm/DoTs/uptime | covered | Dia `dot` | Dia off the target | Checklist 95%. |
| whm/DoTs/clipping | wrong | — | Dia refreshed early (6s / 9s / 12s a minute) | Target-blind, as for every healer DoT. |
| whm/DoTs/applied-into-invuln | superseded | Dia `dot` | Dia shortly before invulnerability | Table only. |
| whm/GlareFlare/dropped-glare-iv | candidate | — | Sacred Sight stacks unused (Glare IV) | Medium 1, Major 2. Three Glare IVs per Presence of Mind; `checkProcs` handles stacks, but the consumer test is unchecked for this one. Worth a Glare IV each. |
| whm/Lilies/bloodlily-overcap | candidate | — | Blood Lily gained at 3 | Medium 1, Major 2. A third of an Afflatus Misery each. Inferred from Afflatus casts. |
| whm/Lilies/bloodlily-leftover | candidate | — | 3 Blood Lilies unspent at the end | Major. Would follow the leftAtKill rule (kills only, time held). |
| whm/Lilies/lily-overcap | no-damage | — | Lilies capped with the timer running | Medium 1, Major 3. A lost heal, and indirectly a slower Misery. |
| whm/Lilies/gcd-heals-instead-of-lily | superseded | `healGcds` | Cure / Medica with Lilies available | Major at 3. The app values each heal GCD by what it did. |
| whm/DivineCaress/dropped | no-damage | — | Divine Grace unused | A shield. |
| whm/OGCDs/checklist | covered | `checkCooldownDrift` (Presence of Mind) | Presence of Mind / Assize held | xivanalysis's checklist target is 75%. The app tracks Presence of Mind only; **Assize** (a damage oGCD) isn't tracked. |
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

1. **Get a White Mage sample** with its xivanalysis page.
2. **whm/OGCDs/checklist, Assize.** Add Assize to the tracked cooldowns.
3. **whm/GlareFlare/dropped-glare-iv, whm/Lilies/bloodlily-*** (candidates).
