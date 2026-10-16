# xivanalysis audit: Red Mage

- **Clone:** xivanalysis `f532855e635bdfb4211cec8128d582dadfdc6a75`
  (2026-09-25). Records extracted 2026-10-15 by a Sonnet subagent (batch 3),
  spot-checked (3 of 3 matched their source); reconciled in the main session.
  Sources are relative to `src/parser/jobs/rdm/` in the clone.
- **Patch:** one branch: `Manafication.tsx:55` turns the Manafication window
  rules off after 7.3 (7.4 cut its stacks from 6 to 3). Supported 7.0–7.5.
- **App:** `lib/damage/ffxiv/jobs/caster.ts` (Red Mage section, `RDM_CHECKS`:
  `manaStacks`, `dualcastWasted`, `verprocOverwrites`),
  `tracked-cooldowns.ts` ("Red Mage"), generic checks. Case study:
  jN3XDrf2z8PmLgRJ Vamp pull 8.
- **xivanalysis bugs found:**
  - `ManaStackGauge.tsx:58-70` (source-confirmed): Jolt III, the main
    filler, isn't in the list of casts that break the mana stacks, so the
    lost-stacks rule misses the most common way to lose them.
  - From the extraction: `MeleeCombos.tsx:406`, the delay-combo counter
    is commented out (dead rule); `GrandImpact.tsx` is never loaded; the
    custom "why" in Prefulgence / Vice of Thorns is overwritten by core.

## Ledger

| id | status | app check | fires-on | notes |
|---|---|---|---|---|
| rdm/ManaStackGauge/lost-stacks | verified | `manaStacks` | a GCD other than the finisher chain after 3 Mana Stacks | Major. Vamp 5:04 (Grand Impact) matched. The app sees every GCD; xivanalysis misses Jolt III (bug). |
| rdm/ManaStackGauge/overcap | covered | `manaStacks` | a 4th enchanted melee GCD with 3 stacks | Major. |
| rdm/Dualcast/wasted | verified | `dualcastWasted` | Dualcast spent on an instant (enchanted melee, Grand Impact) or short cast | Minor 1, Medium 3, Major 5. Matched on Vamp. |
| rdm/Dualcast/expired | covered | `dualcastWasted` ("Dualcast ran out") | Dualcast expiring unused | Medium 1, Major 2. Built 2026-10-15: a Dualcast removed with no cast at that moment is the free hardcast lost (a Verthunder / Veraero III over a Jolt III); forced time or a death right after: shown, not counted. 18 on disk (14 counted). xivanalysis's "lost due to not casting" also counts a Dualcast an instant GCD consumed (its cast hook only clears it for spells with a cast time): jN3XDrf2z8PmLgRJ fight 58's one is the 5:14.2 Enchanted Riposte, which `dualcastWasted` already reports as "spent on Enchanted Riposte" (1 = 1). |
| rdm/Procs/missed-verfire-verstone | verified | `checkProcs` | Verfire / Verstone Ready expiring | Minor 1, Medium 2, Major 7. Vamp's expired Verfire matched. |
| rdm/Procs/overwritten | verified | `verprocOverwrites` | Verfire / Verstone Ready granted while held | Minor 1, Medium 100 (deliberately soft). Vamp 4 + 5 matched. |
| rdm/Procs/invuln | superseded | `noDamageCasts` | Verfire / Verstone spent on an invulnerable target | Minor 1, Medium 2, Major 3. Checked 2026-10-16: `noDamageCasts` lists each proc that hit nothing at its average (jN3XDrf2z8PmLgRJ Vamp pull 1 1:08.0 Verfire, pull 5 1:08.5 Verstone), forced when the target turned immune mid-cast. The proc's mana still came (mana counts per cast), so the hit is the whole loss. Nothing to add. |
| rdm/Procs/grand-impact-dropped | verified | `checkProcs` (against Jolt III) | Grand Impact Ready expiring | Major. Searched 2026-10-16 (10 lowest Red Hot and Deep Blue Red Mages, ff-probe.js): one, RTa4wfbNDQX9CM1k (fetched for this; fight 4, Wind-up Suna) 6:17.7, 44k (Grand Impact less the Jolt III in its slot, `procReplaces` since then; it was a whole Grand Impact, 81k). Prefulgence, Vice of Thorns and Magicked Swordplay were lost only at deaths. Matched xivanalysis 2026-10-16: "timed out 1 time" = 1. |
| rdm/GrandImpact/dropped-module | wrong | — | — | Never loaded; duplicates the row above. |
| rdm/Prefulgence/dropped | covered | `checkProcs` | Prefulgence Ready expiring | Major. Not seen firing. |
| rdm/ViceOfThorns/dropped | covered | `checkProcs` | Thorned Flourish expiring | Major. Not seen firing. |
| rdm/MagickedSwordplay/dropped | covered | `checkProcs` | Magicked Swordplay stacks unused | Several consumers (single and AoE); `checkProcs` takes a second only past 10% of removals. |
| rdm/MagickedSwordplay/invuln | superseded | `noDamageCasts` | an enchanted GCD into invulnerability | As Procs/invuln (Vamp pull 1 2:08.2 Enchanted Zwerchhau). |
| rdm/Combos/derp-order | verified | `checkCombos` | the enchanted combo out of order | Major. Vamp's out-of-order combo matched. |
| rdm/Combos/not-enough-mana | covered | `checkCombos` | an unenchanted melee GCD breaking the combo | Major. |
| rdm/Combos/the-rest | covered | `checkCombos` | other combo breaks | Major. |
| rdm/Combos/core-fallback | covered | `checkCombos` | timeouts and misses | Core tiers; dropped when any other break exists (xivanalysis quirk). |
| rdm/MeleeCombos/wrong-finisher | verified | `rdmWrongFinisher` | Verholy / Verflare chosen against mana and procs | Built 2026-10-16 on the mana simulation: the higher colour's finisher while the lower colour's proc wasn't held and the colours stay under 30 apart gives up a sure proc for a 20% one, 80% of (proc spell − Jolt III). Opener's first 30s forgiven, as in xivanalysis. Any difference counts since 2026-10-16, as in xivanalysis (strict `<`); before, colours under 6 apart weren't judged while the simulation ran ~5 short. 26 on disk now, 0-35k; hand-replayed jN3XDrf2z8PmLgRJ Red Hot and Deep Blue pull 20 3:37.2 (Verflare at 22 White / 24 Black, no Verstone Ready held; the opener ran Black-heavy: three Verthunder IIIs and a Verflare). Earlier calls, e.g. jN3XDrf2z8PmLgRJ Vamp Fatale pull 1 2:12 (78 White / 67 Black, Verholy; hand-checked: no proc followed), Doomtrain pull 5 6:03 and 7:30. Matched xivanalysis 2026-10-16 on jN3XDrf2z8PmLgRJ Red Hot and Deep Blue pull 20 (Laura Razzy): 1 = 1, its 3:31 combo at 72 White / 74 Black, the app's numbers exactly; its starting mana for every combo (1:10 51 / 63, 2:24 72 / 68, 4:12 65 / 62) equals the simulation's. The same page matched the overwrites (2 + 2), expired procs (1 + 1), Dualcast (1) and interrupted casts (4). |
| rdm/MeleeCombos/delay-combo | wrong | — | — | Dead rule (counter commented out). |
| rdm/ManaGauge/overcap | verified | `rdmManaCheck` (gauge-overcap; also White / Black Mana timeline lanes) | White / Black Mana over 100 | Built 2026-10-15 as ManaGauge.tsx's simulation: a spell's mana once per completed cast, hit or not (xivanalysis adds it per damage event and drops it when the hit does nothing), enchanted melee spending, free under Magicked Swordplay; Dawntrail's Manafication grants none. Lost mana is an enchanted combo's chain over the 12s of spells it replaces, per 50. About a dozen on disk, mostly the finishers capping right after a free Magicked Swordplay combo (jN3XDrf2z8PmLgRJ Red Hot and Deep Blue pull 44 4:17-4:22, 4 + 4 + 4 Black). **Model gap fixed 2026-10-16:** 24 of 262 lanes had a spend the simulation lacked mana for (Vamp pull 8 6:50.0, 5 White short). The cause: casts that hit nothing gave no mana (Vamp pull 8's 1:08.4 Verstone on an untargetable Vamp Fatale, 2:05.0 Veraero III on a dead Coffinmaker). Counted per cast, no lane is short, and both pages match exactly: Vamp pull 8 3 White (2:18.3, Resolution at 100; 0 before), jN3XDrf2z8PmLgRJ fight 58 (Red Hot and Deep Blue pull 44) 5 White / 15 Black (2 / 12 before). The earlier "double-counted AoE" explanation of the gap was wrong. **verified** on those two pages. |
| rdm/ManaGauge/imbalance-loss | verified | `rdmManaCheck` | mana gained while the colours are 30+ apart | Built with xivanalysis's rule (the lower colour's gains halved while the other leads by more than 30); one finding per pull. Fires on jN3XDrf2z8PmLgRJ Red Hot and Deep Blue pull 20 0:47-0:57 (5 spells, 13 mana, 87k: a Black-heavy opener left White 40 behind). Matched xivanalysis 2026-10-16: 13 White = 13. |
| rdm/ManaGauge/invuln-miss-loss | unverifiable | — | mana spells that didn't land | Needs the mana model; any non-hit counts (no downtime allowance). |
| rdm/Manafication/gcd-count | wrong | — | (7.0-7.3) under 6 GCDs in Manafication | Major. Off from 7.4 in xivanalysis. Checked 2026-10-16 on the 32 pre-7.4 Red Mage pulls on disk (7.1 Queen Eternal, 7.2 Zelenia, 7.3 Necron): 97 of 101 windows had 6 GCDs; the other 4 ended in the Red Mage's death (xivanalysis counts those). Not adopted. |
| rdm/Manafication/allowed-gcds | no-damage | — | (7.0-7.3) a non-melee GCD in Manafication | Medium 1, Major 2. The allowed list takes nearly every GCD (casts for rushing, Vercure). On the 101 windows the only one outside it was a Verraise (wNHvD38WTbFtGJKr Zelenia pull 8, 8:09): a raise. Not adopted. |
| rdm/Swiftcast/unused | no-damage | — | Swiftcast unused | Utility. |
| rdm/Swiftcast/bad-spell | no-damage | — | Swiftcast on a short spell | Utility, as for every job. |
| rdm/CooldownDowntime/uses | verified | `checkCooldownDrift` | Acceleration, Manafication, Embolden, Fleche, Contre Sixte, Corps-a-corps held | The app counts fewer lost uses by method (whole uses, dead time forced). Manafication valued 2026-10-16 (its Magicked Swordplay combo, finishers and Prefulgence − 6 Jolt / Ver- GCDs): 7 on disk, 254-524k on 7.4 kills (RTa4wfbNDQX9CM1k, QhRqZBwpyCY3Pja9, Mg4p7XG9dtrLVwBf), 4-18k on 7.2 Zelenia (errs low there). No page compared yet. |
| rdm/AlwaysBeCasting/uptime | superseded | `checkGcdGaps` | idle GCD time | — |
| rdm/Weaving/too-many | covered | `checkGcdGaps` | triple weaves | — |
| rdm/Interrupts/cancelled-casts | verified | `checkInterrupts` | a cancelled cast | Vamp 17 matched. |
| rdm/Death/died | verified | `checkDeaths` | a death | Vamp matched. |

## Records

| id | source | trigger / threshold | damage | log-visible | doubts |
|---|---|---|---|---|---|
| rdm/ManaStackGauge/* | modules/ManaStackGauge.tsx:22-149 | overcap / lost stacks: Major 1 | yes | no (rebuilt from casts) | Jolt III not a breaker |
| rdm/Dualcast/* | modules/Dualcast.tsx:17-101 | wasted: Minor 1, Medium 3, Major 5; expired: Medium 1, Major 2 | yes | yes | base cast time, not adjusted |
| rdm/Procs/* | modules/Procs.tsx:6-229 | expired Verprocs: Minor 1, Medium 2, Major 7; overwritten: Minor 1, Medium 100; invuln: Minor 1, Medium 2, Major 3; Grand Impact dropped: Major | yes | yes | — |
| rdm/Prefulgence, ViceOfThorns, GrandImpact | modules/Prefulgence.tsx, ViceOfThorns.tsx, GrandImpact.tsx | dropped: Major | yes | yes | GrandImpact not loaded |
| rdm/MagickedSwordplay/* | modules/MagickedSwordplay.tsx:9-41 | dropped / invuln: core tiers | yes | yes | — |
| rdm/Combos/* | modules/Combos.tsx:17-141 | derp order / not enough mana / the rest: Major 1; core fallback | yes | yes | timeouts dropped |
| rdm/MeleeCombos/* | modules/MeleeCombos.tsx:66-410 | wrong finisher: Minor 1, Medium 2, Major 3; delay: dead | yes | no (mana inferred) | precedence bugs |
| rdm/ManaGauge/* | modules/ManaGauge.tsx:21-219 | overcap / imbalance / invuln losses: Minor 1, Medium 20, Major 80 | yes | no (inferred) | Manafication mana missing |
| rdm/Manafication/* | modules/Manafication.tsx:13-148 | 6 GCDs: Major 1; disallowed GCDs: Medium 1, Major 2 (7.0-7.3) | yes | yes | — |
| rdm/Swiftcast/* | modules/Swiftcast.tsx:11-59 | unused / short spell: Major 1 | no | yes | — |
| rdm/CooldownDowntime/uses | modules/GeneralCDDowntime.ts:3-40 | checklist 95% | yes | yes | Acceleration hold ignored (charges) |

## Open

In priority order (biggest damage cost first):

1. **rdm/Procs/grand-impact-dropped, Prefulgence, Vice of Thorns,
   Magicked Swordplay** (covered). Not seen firing.
