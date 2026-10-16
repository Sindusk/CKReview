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
| rdm/Dualcast/expired | candidate | — | Dualcast expiring unused | Medium 1, Major 2. Consumed by any spell, so `checkProcs` finds no single consumer. No death allowance in xivanalysis. |
| rdm/Procs/missed-verfire-verstone | verified | `checkProcs` | Verfire / Verstone Ready expiring | Minor 1, Medium 2, Major 7. Vamp's expired Verfire matched. |
| rdm/Procs/overwritten | verified | `verprocOverwrites` | Verfire / Verstone Ready granted while held | Minor 1, Medium 100 (deliberately soft). Vamp 4 + 5 matched. |
| rdm/Procs/invuln | candidate | — | Verfire / Verstone spent on an invulnerable target | Minor 1, Medium 2, Major 3. `noDamageCasts` sees a cast that hit nothing; this is most of it. |
| rdm/Procs/grand-impact-dropped | covered | `checkProcs` | Grand Impact Ready expiring | Major. Not seen firing. |
| rdm/GrandImpact/dropped-module | wrong | — | — | Never loaded; duplicates the row above. |
| rdm/Prefulgence/dropped | covered | `checkProcs` | Prefulgence Ready expiring | Major. Not seen firing. |
| rdm/ViceOfThorns/dropped | covered | `checkProcs` | Thorned Flourish expiring | Major. Not seen firing. |
| rdm/MagickedSwordplay/dropped | covered | `checkProcs` | Magicked Swordplay stacks unused | Several consumers (single and AoE); `checkProcs` takes a second only past 10% of removals. |
| rdm/MagickedSwordplay/invuln | candidate | — | an enchanted GCD into invulnerability | As Procs/invuln. |
| rdm/Combos/derp-order | verified | `checkCombos` | the enchanted combo out of order | Major. Vamp's out-of-order combo matched. |
| rdm/Combos/not-enough-mana | covered | `checkCombos` | an unenchanted melee GCD breaking the combo | Major. |
| rdm/Combos/the-rest | covered | `checkCombos` | other combo breaks | Major. |
| rdm/Combos/core-fallback | covered | `checkCombos` | timeouts and misses | Core tiers; dropped when any other break exists (xivanalysis quirk). |
| rdm/MeleeCombos/wrong-finisher | candidate | — | Verholy / Verflare chosen against mana and procs | Minor 1, Medium 2, Major 3. Rests on the inferred mana gauge. |
| rdm/MeleeCombos/delay-combo | wrong | — | — | Dead rule (counter commented out). |
| rdm/ManaGauge/overcap | covered | `rdmManaCheck` (gauge-overcap; also White / Black Mana timeline lanes) | White / Black Mana over 100 | Built 2026-10-15 as ManaGauge.tsx's simulation: a spell's mana when it lands (none when it hits nothing: jN3XDrf2z8PmLgRJ Vamp pull 8's 1:08.4 Verstone on an untargetable Vamp Fatale, 2:05.0 Veraero III on a dead Coffinmaker), once per cast (xivanalysis adds it per damage event, so its AoE finishers on two targets count twice), enchanted melee spending, free under Magicked Swordplay; Dawntrail's Manafication grants none. Lost mana is an enchanted combo's chain over the 12s of spells it replaces, per 50. About a dozen on disk, mostly the finishers capping right after a free Magicked Swordplay combo (jN3XDrf2z8PmLgRJ Red Hot and Deep Blue pull 44 4:17-4:22, 4 + 4 + 4 Black). Model gap: 24 of 262 lanes have a spend the simulation lacked mana for (Vamp pull 8 6:49.9, ~5 White short; no gain in xivanalysis's table explains it), so those lanes are marked inference. Vamp pull 8: 0 here against xivanalysis's 3 (its double-counted AoE gains). |
| rdm/ManaGauge/imbalance-loss | covered | `rdmManaCheck` | mana gained while the colours are 30+ apart | Built with xivanalysis's rule (the lower colour's gains halved while the other leads by more than 30); one finding per pull. None on disk: the samples never run 30 apart. |
| rdm/ManaGauge/invuln-miss-loss | unverifiable | — | mana spells that didn't land | Needs the mana model; any non-hit counts (no downtime allowance). |
| rdm/Manafication/gcd-count | candidate | — | (7.0-7.3) under 6 GCDs in Manafication | Major. Off from 7.4 in xivanalysis. |
| rdm/Manafication/allowed-gcds | candidate | — | (7.0-7.3) a non-melee GCD in Manafication | Medium 1, Major 2. |
| rdm/Swiftcast/unused | no-damage | — | Swiftcast unused | Utility. |
| rdm/Swiftcast/bad-spell | no-damage | — | Swiftcast on a short spell | Utility, as for every job. |
| rdm/CooldownDowntime/uses | verified | `checkCooldownDrift` | Acceleration, Manafication, Embolden, Fleche, Contre Sixte, Corps-a-corps held | The app counts fewer lost uses by method (whole uses, dead time forced). |
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

1. **rdm/ManaGauge/*** (covered): compare a page where it fires, e.g.
   jN3XDrf2z8PmLgRJ Red Hot and Deep Blue pull 44 (Laura Razzy), and
   find the ~5 White Mana missing on Vamp pull 8 before 6:49.9.
2. **rdm/Dualcast/expired** (candidate). A lost free hardcast each.
3. **rdm/MeleeCombos/wrong-finisher** (candidate). Rests on the mana model.
4. **rdm/Manafication/*** (candidates, 7.0-7.3 logs only).
5. **rdm/Procs/grand-impact-dropped, Prefulgence, Vice of Thorns,
   Magicked Swordplay** (covered). Not seen firing.
