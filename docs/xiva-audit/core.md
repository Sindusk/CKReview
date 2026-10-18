# xivanalysis audit: core modules

- **Clone:** xivanalysis `f532855e635bdfb4211cec8128d582dadfdc6a75`
  (2026-09-25), read 2026-10-15. Paths below are relative to
  `src/parser/core/modules/` in that clone.
- **Patch:** core has no `patch.before / is / after` branches; every
  record is `all`.
- **App side:** `lib/damage/checks.ts` (generic checks),
  `lib/damage/ffxiv/jobs/shared.ts` (burst windows, DoTs, AoE, gauges),
  `lib/damage/ffxiv/tracked-cooldowns.ts`, `lib/damage/ffxiv/jobs/tincture.ts`,
  `lib/damage/buffs.ts`.
- **Method:** pilot, extracted by hand (no subagent), so no separate
  spot-check.

Statuses here describe the **generic mechanism**. Whether it holds for a
job, and whether it has fired on a real log, is in the job's ledger.

## Ledger

| id | status | app check | fires-on | notes |
|---|---|---|---|---|
| core/AlwaysBeCasting/uptime | superseded | `checkGcdGaps` | a pull with idle GCD time | 98% GCD uptime, a checklist row. Divides by the pull less downtime. The app values each gap in lost damage instead. |
| core/AlwaysBeCasting/gcd-downtime | covered | `checkGcdGaps` | a gap longer than GCD + 150ms | It measures from a hard cast's end + 500ms slidecast and needs a full GCD + 150ms in every window, so it misses ~1.6s after hard casts (checks.ts header). The app's count can be higher by method. |
| core/Weaving/too-many-weaves | covered | `checkGcdGaps` (`gcd-clipping`, 3+ weaves) | 3 oGCDs after an instant GCD, or fewer after a cast | xivanalysis's limit depends on cast time: 2 weaves after an instant, 1 after a 1s+ cast, 0 after a 2.5s+ cast, one fewer when the recast is under 1.8s. The app's 3-weave rule matches only after instants. After hard casts the extra idle shows up as a gap anyway. |
| core/Interrupts/cancelled-casts | covered | `checkInterrupts` | a cast cut by movement | It lists the cancelled cast's cast time; the app counts the idle. Only fires for jobs with cast times. |
| core/CooldownDowntime/uses | covered | `checkCooldownDrift` + tracked-cooldowns.ts | a cooldown held past ready | Each job's groups, offsets and allowances were ported. The app counts only whole lost uses, less forced time. Open: room for uses skips forced time while casts include presses made in it (open-items, "cooldown room"). |
| core/DoTs/uptime | covered | `dotFindings` (shared.ts) | a DoT left off the target | Uptime ÷ (pull − that target's invulnerable time), averaged over every target it was ever applied to. Adds with short lives drag the average. |
| core/DoTs/clipping | superseded | `dotFindings` (shared.ts, per target) | a refresh before expiry | **Target-blind:** it sums ms-per-minute over every target, so two bosses double it (dps-analysis.md). It also counts snapshot refreshes (Iron Jaws) as clipping. The app values a refresh by what it costs instead. Proposed `wrong`; the user chose `superseded` 2026-10-18 with every job's clipping row (ast, sch, sge, whm, brd, blm, sam, drg). |
| core/DoTs/applied-into-invuln | superseded | `dotFindings` | a DoT applied shortly before the target turns invulnerable | Output table only, no suggestion (`defaultInvulnWarningDuration` 0 by default). |
| core/Procs/dropped | covered | `checkProcs` (expiries) | a proc left to expire | Forgiven at death, downtime and the end of the pull. Off unless the job sets `showDroppedProcSuggestion`. checkProcs sees expiries only; a proc removed by another press needs a job check (dps-analysis.md). |
| core/Procs/overwritten | covered | job checks (`procOverwrites`, ranged.ts and others) | a proc granted again while one is held | Off unless the job sets `showOverwroteProcSuggestion`. `mayOverwrite` and `considerOverwrittenProcs` excuse some per job. |
| core/Procs/used-on-invuln | superseded | `noDamageCasts` | a proc spent on an invulnerable target | Off unless the job sets `showInvulnProcSuggestion`. `noDamageCasts` lists every damage action that hit nothing, procs included, forced when the boss was untargetable (2026-10-16: Summoner Ruin IV at qjCMx4bRfgNKwX9T 6:21, pnLBzfbH8NjGAJRg Enuo pull 9 4:05). |
| core/AoEUsages/too-few-targets | covered | `aoeOnOneTargetFindings` / `aoeComboOnOneTarget` | an AoE that hit fewer targets than its minimum | Tiers: Minor 1, Medium 4, Major 7. Each job sets the pairs and minimums. |
| core/Combos/broken | covered | `checkCombos` | a wrong step, a non-combo GCD, a miss, or a 30s timeout | Excused after downtime (1s grace). Tiers: Minor 1, Medium 2, Major 4. |
| core/Positionals/missed | covered | `checkPositionals` | a positional's bonus missing | A checklist row per action. |
| core/Death/died | covered | `checkDeaths` | a death | The last death of a wipe isn't counted. |
| core/Swiftcast/bad-use | no-damage | — | Swiftcast unused, or used on a short cast | Jobs supply validators. caster.ts/healer.ts headers: not adopted. |
| core/LucidDreaming/held | no-damage | — | Lucid held past its cooldown | MP management. |
| core/Overheal/percent | no-damage | — | overheal past 35% | Healing efficiency (checklist target 65%). |
| core/ActionWindow/expected-gcds | covered | `burstWindowFindings` `expectedGcds` | a buff window with too few GCDs | `ExpectedGcdCount`: min(expected, ⌈(len − 250ms) ÷ GCD⌉). `RequiredGcdCount`: a fixed count unless the end of the pull rushed the window. |
| core/ActionWindow/expected-actions | covered | `burstWindowFindings` `expected` | a window missing an expected action | `ExpectedActions` / `ExpectedActionGroups`; jobs adjust counts per window. |
| core/ActionWindow/allowed-gcds-only | covered | job checks (DNC Technical fillers and others) | a GCD not on the allowed list | Per-job lists. |
| core/ActionWindow/limited-actions | covered | job checks | more of an action than allowed in a window | Per-job lists. |
| core/ActionWindow/players-buffed | covered | buffs.ts coverage | a party buff that missed a player | Display only in xivanalysis (`suggest` returns nothing). The app values it. |
| core/ActionWindow/raid-buff-overwrite | candidate | — | the same buff from two players of one job overlapping | A note column only, no suggestion. Rare in a fixed static. Counted 2026-10-18 on all 822 FFXIV pulls on disk: no pull has two players of a raid-buff job (the only duplicated jobs are two Gunbreakers and two Dark Knights in L9BzKkD2nxcVgHTC Necron pulls 7-11), so 0 overlaps. Not built; the cost would be the second buff's value lost to the overlap (same-status party buffs don't stack). |
| core/BuffGroupWindow/failed-overlap | covered | `bardBuffMisaligned` (brd.md, brd/BurstWindow/failed-overlap) | one of a group's buffs ending before all of them overlapped | Only Bard uses BuffGroupWindow; its row is the Bard one, built 2026-10-18. |

## Not rules (display only)

- **Tincture / Medicated:** a window table and a timeline row, with no
  judgment. The app's tincture check (tincture.ts) is its own.
- **DisengageGcds:** a statistic counting the job's ranged filler. The
  app judges each use (`checkDisengages`).
- **Gauge:** core gauge classes (Counter, Set, Enum, Timer) feed graphs
  and an optional overcap table. Rules come from jobs.
- **Defensives / UtilityActions:** use tables, mitigation.
- **Hijinks:** an April Fools' suggestion.

## Hooks a job module can set

- **AlwaysBeCasting:** `considerCast` (leave casts out of uptime; Bard
  leaves out Army's Paeon / Muse), `getUptimePercent`, the description
  text.
- **Weaving:** `getMaxWeaves`, `ignoredActionIds`, severity.
- **Interrupts:** severity, text.
- **CooldownDowntime:** `trackedCds` (groups: shared recast,
  `allowedAverageDowntime`, `firstUseOffset`, `resetBy` refunds,
  `weight`), `suggestionOnlyCooldowns`, `countUsage`, checklist target.
- **DoTs:** `trackedStatuses`, `addChecklistRules` and
  `addClippingSuggestions` (the job sets tiers and targets),
  `excludeApplication`, invuln warning thresholds.
- **Procs:** `trackedProcs` (status, consumers, `mayOverwrite`,
  priority), which of the three suggestions to show, tiers,
  `considerDroppedProcs`, `considerOverwrittenProcs`,
  `jobSpecificCheckConsumeProc`, `actionMayConsumeAdditionalProcs`.
- **AoEUsages:** `trackedActions` (AoE, single-target alternatives,
  minimum targets), `adjustMinTargets`, severity.
- **Combos:** `isAllowableComboBreak`, `addJobSpecificSuggestions`.
- **ActionWindow / BuffWindow:** `buffStatus`, evaluators, ignored or
  tracked actions, history filters, `statusDurationFudge` (1s),
  end-of-window mode (STRICT drops casts at the removal instant),
  `isRushedEndOfPullWindow`.
- **Death:** `shouldCountDeath`.
