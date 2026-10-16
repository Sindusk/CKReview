# xivanalysis audit: Sage

- **Clone:** xivanalysis `f532855e635bdfb4211cec8128d582dadfdc6a75`
  (2026-09-25). Records extracted 2026-10-15 by a Sonnet subagent (batch 1),
  spot-checked (3 of 3 matched their source); reconciled in the main session.
  Sources are relative to `src/parser/` in the clone.
- **Patch:** no patch branches in `jobs/sge`; supported 7.0–7.5.
- **App:** `lib/damage/ffxiv/jobs/healer.ts` (header, `SGE_CHECKS`:
  `healGcds`, `aoeOnOneTarget`, Eukrasian Dosis III / Dyskrasia `dot`),
  `gauges.ts` (Addersgall, Addersting lanes), `tracked-cooldowns.ts`
  ("Sage": Phlegma III, Psyche), generic checks. Case studies:
  jN3XDrf2z8PmLgRJ Vamp pull 8, dDar482XvFKBPJYh FRU, K6qfMamL7rN8yz2Q
  (three kills).

## Ledger

| id | status | app check | fires-on | notes |
|---|---|---|---|---|
| sge/DoTs/uptime | verified | Eukrasian Dosis III / Dyskrasia `dot` | the DoT off the target | K6qfMamL7rN8yz2Q 91.9% (gaps 1:05, 4:06, 7:36, 8:10), 73.2% and 85% matched. |
| sge/DoTs/clipping | wrong | — | the DoT refreshed early (6s / 9s / 12s a minute) | FRU 24.4s a minute was double casts on P4's two bosses. The app finds tincture-snapshot refreshes itself (The Tyrant 7:15, 9:51; 58k). |
| sge/AoEUsages/dyskrasia | covered | `dyskrasiaOnOne` | Eukrasian Dyskrasia hitting under 3 targets | Built 2026-10-16 for one target only. Premise check on 393 Sage pulls (36 Eukrasian Dyskrasias): on two enemies it's even (100-118k over 30s against about 100k for one Dosis III), so xivanalysis's 3-target minimum overstates. On one enemy each tick loses the average Dosis III tick (multiplier out, this tick's back in) minus what it dealt: H9fnVZgPA3krpCzY Lindwurm II pull 24 0:57 (56k), jN3XDrf2z8PmLgRJ Vamp Fatale pull 4 5:46 (33k), K6qfMamL7rN8yz2Q Vamp Fatale pull 1 5:21 (25k). The instant Dyskrasia II is left out on purpose (the moving GCD). xivanalysis's page for H9fnVZgPA3krpCzY pull 24 (Sin Dusk) is silent, by a bug: its core AoEUsages counts targets on the action's own damage event, and Eukrasian Dyskrasia has none (DoT ticks only: 0:57.1 cast, ten ticks on Lindwurm from 0:59.5), so the rule can never fire. The app's call stands. |
| sge/CooldownDowntime/phlegma | verified | `checkCooldownDrift` + `usesLostAtKill` | Phlegma III held at 2 charges | Checklist target 80%. FRU 28/29 is perfect play only (not counted). K6qfMamL7rN8yz2Q 14/15: a charge held to the kill, the kill rule. |
| sge/CooldownDowntime/psyche | verified | `checkCooldownDrift` | Psyche held | FRU 16/17 holds (5:10, 41s before P2's downtime). The Tyrant 10/11: 27s held, under a recast (not counted). |
| sge/Tincture/expected-actions | superseded | tincture.ts | 2 Phlegma, Psyche missing under the tincture | The Tyrant 9:50: the app moves the tincture to 10:08, which covers both. |
| sge/Gauge/lost-addersgall | no-damage | — | Addersgall at 3 with the timer stopped | Healing and MP. Drawn on the timeline. |
| sge/Gauge/lost-to-rhizomata | no-damage | — | Rhizomata at 2+ Addersgall | Healing resource. |
| sge/Gauge/addersting-overcap | no-damage | — | Addersting over 3 | Toxikon is a moving GCD at Dosis potency or less. Drawn on the timeline. |
| sge/Gauge/addersgall-used-stat | no-damage | — | — | Statistic. |
| sge/Kardia/uptime | no-damage | — | Kardia off a target | Healing. |
| sge/Zoe/gcd-count | no-damage | — | Zoe with no heal GCD in it | Healing. |
| sge/Swiftcast/unused | no-damage | — | Swiftcast unused | Utility. |
| sge/Weaving/too-many | verified | `checkGcdGaps` | too many weaves | 5 weaving issues on The Tyrant and the 2:04 weave on Red Hot matched by time. |
| sge/Interrupts/cancelled-casts | verified | `checkInterrupts` | a cancelled Dosis III | 4 matched on each K6qfMamL7rN8yz2Q kill; some forced (boss leaving, a tower). |
| sge/AlwaysBeCasting/uptime | superseded | `checkGcdGaps` | idle GCD time | 97.0% / 96.6%, 94.7% matched. Its gap list misses ~1.6s after every Dosis III (5 to the app's 18 on Vamp, all real). |
| sge/Overheal/avoid-overheal | superseded | `healGcds` | overheal over 35% | The app values heal GCDs by what they did. |
| sge/Death/died | verified | `checkDeaths` | a death | The Tyrant 3:29 matched. |

Core modules that can't fire for Sage: Combos, Positionals, Procs,
Disengage.

**Display only, no rule:** gauge graphs, Defensives / Utilities tables,
Tincture table, the DoT-into-invulnerability table (not adopted: every
application checked ran its course or out-did a Dosis III).

## Records

| id | source | trigger / threshold | damage | log-visible | doubts |
|---|---|---|---|---|---|
| sge/DoTs/uptime | sge/modules/DoTs.tsx:21-40 | checklist 95% (Dosis III and Dyskrasia, mutually exclusive) | yes | yes | adds dilute it |
| sge/DoTs/clipping | DoTs.tsx:8-14, 42-55 | ms per minute: Minor 6s, Medium 9s, Major 12s | yes (in principle) | yes | target-blind |
| sge/AoEUsages/dyskrasia | sge/modules/AoEUsages.ts:3-14 | Eukrasian Dyskrasia under 3 targets: Minor 1, Medium 4, Major 7 | yes | yes | 2 targets near break-even |
| sge/CooldownDowntime/* | sge/modules/CooldownDowntime.tsx:5-20 | Phlegma III, Psyche; hold 1.25s; checklist 80% | yes | yes | phase holds count |
| sge/Tincture/expected-actions | sge/modules/Tincture.tsx:11-42 | 2 Phlegma III, 1 Psyche per window: Minor 1, Medium 2, Major 3 | yes | yes | no end-of-pull allowance |
| sge/Gauge/lost-addersgall | sge/modules/Gauge.tsx:18-19, 90-98, 131-160, 211-231 | ⌊stopped timer ÷ 20s⌋ (10s leniency; 20s+ unable-to-act gains): Minor 1, Medium 3, Major 5 | indirect | no (inferred) | — |
| sge/Gauge/lost-to-rhizomata | Gauge.tsx:153-160, 233-245 | any whole stack of timer lost to Rhizomata: Minor | no | no | — |
| sge/Gauge/addersting-overcap | Gauge.tsx:34-40, 68-78, 247-261 | overcap ≥ 1 (starts at 3): Minor 1, Medium 3, Major 5 | indirect | no (shield breaks inferred) | — |
| sge/Kardia/uptime | sge/modules/Kardia.tsx:21-49 | checklist 100% | indirect | yes | downtime subtracted from both sides |
| sge/Zoe/gcd-count | sge/modules/Zoe.tsx:14-52 | no heal GCD in Zoe: Medium 1, Major 2 | no | yes | — |
| sge/Swiftcast, Weaving, Interrupts, AlwaysBeCasting, Overheal, Death | core (text overrides only) | core rules | — | yes | — |

## Open

None. sge/AoEUsages/dyskrasia can't be matched on a page: xivanalysis's
rule never fires (see the row).
