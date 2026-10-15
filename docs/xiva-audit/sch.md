# xivanalysis audit: Scholar

- **Clone:** xivanalysis `f532855e635bdfb4211cec8128d582dadfdc6a75`
  (2026-09-25). Records extracted 2026-10-15 by a Sonnet subagent (batch 1),
  spot-checked (3 of 3 matched their source); reconciled in the main session.
  Sources are relative to `src/parser/` in the clone.
- **Patch:** no patch branches in `jobs/sch`; supported 7.0–7.5.
- **App:** `lib/damage/ffxiv/jobs/healer.ts` (header, `SCH_CHECKS`:
  `healGcds`, `aoeOnOneTarget`, Biolysis `dot`), `tracked-cooldowns.ts`
  ("Scholar": Chain Stratagem, Aetherflow valued from Energy Drain),
  generic checks. Case studies: qjCMx4bRfgNKwX9T Dancing Mad (fights 10
  and 16).

## Ledger

| id | status | app check | fires-on | notes |
|---|---|---|---|---|
| sch/DoTs/uptime | verified | Biolysis `dot` | Biolysis off the target | Fight 16's 82.3% is downtime plus the two P5 findings the app has. |
| sch/DoTs/clipping | wrong | — | Biolysis refreshed early (6s / 9s / 12s a minute) | 15.8s a minute on Dancing Mad was P3's two bosses; per target ~48s over the pull. |
| sch/DoTs/applied-into-invuln | superseded | Biolysis `dot` | Biolysis shortly before invulnerability | Table only. 6:03 / 6:06 got 3-5 ticks, a Broil IV's worth; 11:56 and 14:03 are dot findings. |
| sch/CooldownDowntime/chain-stratagem | verified | `checkCooldownDrift` | Chain Stratagem held | Fight 16 9/10 not adopted: held across P4's downtime to meet the 16:16 raid buffs. |
| sch/CooldownDowntime/aetherflow | verified | `checkCooldownDrift` (valued from Energy Drain) | Aetherflow held | Fight 16 17/18 built from it: the last one came back 0.2s before the kill, so no use. |
| sch/Aetherflow/drift | superseded | `checkCooldownDrift` | Aetherflow / Dissipation drift, wasted stacks | A table only. Its Dissipation drift counts time Seraph locks Dissipation out (user-confirmed lockout). |
| sch/Procs/impact-imminent-dropped | covered | `checkProcs` | Impact Imminent expiring without Baneful Impaction | Medium at 1. Not seen firing. |
| sch/FaerieGauge/overcap | no-damage | — | Faerie Gauge over 100 (30+ overcap) | Healing resource. |
| sch/Overheal/* | superseded | `healGcds` | overheal over 35% | The app values heal GCDs by what they did. |
| sch/Weaving/too-many | verified | `checkGcdGaps` | too many weaves (lenient tiers: Minor 1, Medium 5, Major 10) | Fight 10: 17:24 6.2s, 17:19, 18:16, 17:55 matched; fight 16: 1:55 4.9s, 13:51-13:57, 16:54, 12:57. 11:49 / 11:29 are the end-of-P3 hold (forced). |
| sch/Interrupts/cancelled-casts | verified | `checkInterrupts` | a cancelled cast | 6 and 27 matched. |
| sch/AlwaysBeCasting/uptime | superseded | `checkGcdGaps` | idle GCD time | Matched on both kills. |
| sch/AlwaysBeCasting/gcd-downtime | covered | `checkGcdGaps` | a gap past GCD + 150ms | Misses ~1.6s after hard casts by method. |
| sch/Swiftcast/bad-use | no-damage | — | Swiftcast unused | Utility (7/23 not adopted). |
| sch/Death/died | covered | `checkDeaths` | a death | Generic. |

Core modules that can't fire for Scholar: Combos, Positionals, Disengage;
the core proc dropped / overwritten / invulnerable suggestions are off (the
job's own Impact Imminent one replaces them).

**Display only, no rule:** Overheal tables for non-checklist categories,
the Aetherflow table, Defensives / Utilities.

## Records

| id | source | trigger / threshold | damage | log-visible | doubts |
|---|---|---|---|---|---|
| sch/DoTs/uptime | sch/modules/DoTs.tsx:24-42 | checklist 95% | yes | yes | adds dilute it |
| sch/DoTs/clipping | DoTs.tsx:11-18, 44-57 | ms per minute: Minor 6s, Medium 9s, Major 12s | indirect | yes | target-blind |
| sch/CooldownDowntime/* | sch/modules/CooldownDowntime.tsx:4-13 | Chain Stratagem (first use 10s), Aetherflow (7.5s); hold 1.25s; checklist 95% | yes | yes | phase holds count |
| sch/Aetherflow/drift | sch/modules/Aetherflow.tsx:82-170, 204-244 | table: drift and wasted stacks | indirect | yes | Seraph lockout unseen |
| sch/Procs/impact-imminent-dropped | sch/modules/Procs.tsx:6-28 | any Impact Imminent drop: Medium | yes | yes | — |
| sch/FaerieGauge/overcap | sch/modules/FaerieGauge.tsx:14-132 | total overcap ≥ 30: Minor | no | no (inferred) | — |
| sch/Overheal/* | sch/modules/Overheal.tsx:13-106 | checklist 65% (GCD heals, Aetherflow, shield overwrites) | no | yes | — |
| sch/Weaving/too-many | sch/modules/Weaving.tsx:6-19 | core rule, tiers Minor 1, Medium 5, Major 10 | yes | yes | — |
| sch/Interrupts, Swiftcast, AlwaysBeCasting, Death | core (text overrides only) | core rules | — | yes | — |

## Open

1. **sch/Procs/impact-imminent-dropped** (covered). Not seen firing.
