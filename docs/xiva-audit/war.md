# xivanalysis audit: Warrior

- **Clone:** xivanalysis `f532855e635bdfb4211cec8128d582dadfdc6a75`
  (2026-09-25). Records extracted 2026-10-15 by a Sonnet subagent (batch 1),
  spot-checked (3 of 3 matched their source); reconciled in the main session.
  Sources are relative to `src/parser/` in the clone.
- **Patch:** no patch branches in `jobs/war`; supported 7.0–7.5.
- **App:** `lib/damage/ffxiv/jobs/pld-war.ts` (header, `WAR_CHECKS`:
  `surgingTempest`, `warAoeCombo`, `beastGauge`, `nascentChaos`),
  `gauges.ts` (Beast lane), `tracked-cooldowns.ts` ("Warrior": Inner
  Release, Upheaval / Orogeny, Onslaught), generic checks. Case studies:
  qjCMx4bRfgNKwX9T Dancing Mad, K6qfMamL7rN8yz2Q (three kills).

## Ledger

| id | status | app check | fires-on | notes |
|---|---|---|---|---|
| war/SurgingTempest/uptime | verified | `surgingTempest` (`uptimeFindings`) | Surging Tempest drops of 2.5s+ | Checklist 90%. Matched on qjCMx4bRfgNKwX9T. Its 104.6% on Red Hot comes from dividing by fight time less invulnerability. |
| war/Gauge/beast-overcap | verified | `beastGauge` | Beast Gauge over 100 | Tiers start at 20, so Vamp's 10 shows only in the app. qjCMx4bRfgNKwX9T 60 and Red Hot 30 matched exactly. |
| war/Procs/dropped-inner-release | verified | `checkProcs` (stacks; `procReplaces`) | an Inner Release stack expiring | Major at 1. Vamp 1:26 matched, valued as Fell Cleave minus the Maim in its slot (50k). |
| war/Procs/dropped-primal-rend | verified | `checkProcs` (consumer declared: `procConsumers`) | Primal Rend Ready expiring | **Gap fixed 2026-10-16:** the generic check infers a proc's consumer only from 60% of 3+ removals, so a player who drops most of them (L9BzKkD2nxcVgHTC Necron pull 18: 1 of 3 consumed) went unjudged. Consumers now declared from xivanalysis's war/Procs.tsx; priced against Maim, like Fell Cleave (the Primal Ruination it unlocks isn't valued). Matched xivanalysis on that pull: 2 = 2 (1:38.8, 3:17.2). 16 on disk now, 3 forced. |
| war/Procs/dropped-primal-ruination | verified | `checkProcs` (declared) | Primal Ruination Ready expiring | Its text says 20s; the data says 30s. Fires since the consumers are declared: mgTQJjX2nW6ANkP7 1:37.9 (hand-checked: ready 1:16.7, Fell Cleaves and Inner Chaos pressed instead), cBZXM6kayd7Tf9Fg 9:20.6, Necron wipes. Matched xivanalysis 2026-10-16 on mgTQJjX2nW6ANkP7 (Kahn Aar): 1 = 1; its Inner Release stacks (2), Beast gauge lost (210) and combos (3) matched too. |
| war/Procs/dropped-primal-wrath | covered | `checkProcs` (declared) | Wrathful expiring | Not seen firing. |
| war/Infuriate/nascent-chaos-dropped | covered | `checkProcs` | Nascent Chaos expiring | Not seen firing. |
| war/Infuriate/nascent-chaos-overwritten | verified | `nascentChaos` | Infuriate with Nascent Chaos held | Red Hot 0:14.4 (36k) built from it; the only one across the samples. |
| war/Infuriate/cdr-hook | no-damage | — | — | A cooldown model (5s per spender), no rule. |
| war/OGCDDowntime/infuriate | covered | `infuriateHeld` | Infuriate sitting at 2 charges | Built 2026-10-16 as its own check (not tracked-cooldowns.ts): the recharge is simulated with the 5s refund per Fell Cleave / Decimate / Inner Chaos / Chaotic Cyclone; time at two charges outside forced time and death, past 2.5s (opener) and 1.25s per stretch, counts; each whole 60s is a use lost, worth Inner Chaos over the average GCD. 43 of 164 Warrior pulls on disk sat capped 15s+ before forced time came out; after it, only the Necron Warrior on L9BzKkD2nxcVgHTC fires (pulls 9, 18, 20; 34-50k; pull 18 hand-checked: no Infuriate from about 1:30 to 3:12). qjCMx4bRfgNKwX9T and the FRU pulls are all downtime, as the hand simulation said. Against xivanalysis 2026-10-16 on L9BzKkD2nxcVgHTC Necron pull 18 (Widow Shadowimage): its checklist 4 / 7, the app 1 lost (111.5s held, now counting the 5s refunds of spenders pressed at two charges). Its 7 assumes refunds the player never earned (200 Beast gauge lost at the cap) and runs to the wipe's end: not adopted. |
| war/OGCDDowntime/inner-release | verified | `checkCooldownDrift` (first use 15s, hold 2.5s) | Inner Release held | Same groups as xivanalysis. |
| war/OGCDDowntime/upheaval-orogeny | verified | `checkCooldownDrift` | Upheaval / Orogeny held | qjCMx4bRfgNKwX9T 33/34 and The Tyrant 20/21 not adopted: each stretch held under one recast. |
| war/OGCDDowntime/onslaught | verified | `checkCooldownDrift` (charges) | Onslaught at 3 charges | qjCMx4bRfgNKwX9T: it says 2 lost, the app 1 (the other is the opener's normal hold). |
| war/AoE/chaotic-cyclone | verified | `warAoeCombo` (vs Inner Chaos, minimum 3) | Chaotic Cyclone on under 3 targets | Built 2026-10-15. Premise holds (same Nascent Chaos). Fires on L9BzKkD2nxcVgHTC Necron pull 15 0:38 (one target, 43k) and pull 9 3:46 (two, 14k). Matched xivanalysis on Necron pull 15: Chaotic Cyclone 1, Decimate 4, Overpower 2, all the same. |
| war/AoE/decimate | verified | `warAoeCombo` (vs Fell Cleave, minimum 3) | Decimate on under 3 targets | Fires on L9BzKkD2nxcVgHTC Necron pull 15 (0:33, 2:23-2:28, the boss alone, 41-51k each), pulls 7, 16, 21; n6zTGPJh8wkLFRZ9 Vamp Fatale pull 1 5:17-5:22 (one or two targets, 22-51k). |
| war/AoE/overpower | verified | `warAoeCombo` | Overpower on one target | qjCMx4bRfgNKwX9T 6 matched (3 forced past HP checks). The app also checks Mythril Tempest. |
| war/Combos/broken | verified | `checkCombos` | a broken or timed-out combo | Red Hot 4:27, 6:16 and The Tyrant 2:07 matched. |
| war/Tincture/gcd-count | superseded | tincture.ts | under 12 GCDs in the tincture | The Tyrant 10:33 (2 GCDs, drunk 4.4s before the kill): valuing it asks him to predict the kill. |
| war/Tincture/expected-actions | superseded | tincture.ts | Inner Chaos, Onslaught and the Primal GCDs missing under the tincture | Each miss was used just outside the window: ~2-5% of one action. |
| war/Tomahawk/disengage-count | verified | `checkDisengages` | Tomahawk pressed | A statistic in xivanalysis. Red Hot 6 and The Tyrant 9 matched; the app judges each (most in movement). |
| war/AlwaysBeCasting/uptime | superseded | `checkGcdGaps` | idle GCD time | Red Hot 97.0%; downtimes match by time. |
| war/Weaving/too-many | verified | `checkGcdGaps` | triple weaves | qjCMx4bRfgNKwX9T 6:09, 15:27 and Red Hot 3:24, 4:27 matched. |
| war/Death/died | verified | `checkDeaths` | a death | The Tyrant 4:20.9 matched. |

Core modules that can't fire for Warrior: DoTs, Positionals, Swiftcast,
Lucid, Overheal, Interrupts (no cast times).

**Display only, no rule:** Defensives, timeline rows, the tincture table,
the Beast Gauge graph.

## Records

| id | source | trigger / threshold | damage | log-visible | doubts |
|---|---|---|---|---|---|
| war/SurgingTempest/uptime | war/modules/SurgingTempest.tsx:22-41 | uptime on friends ÷ (pull − invulnerable): checklist 90% | yes | yes | downtime not subtracted |
| war/Gauge/beast-overcap | war/modules/Gauge.tsx:14-97 | overcap points: Minor 20, Major 50 | indirect | no (inferred) | no reset on death |
| war/Procs/dropped-* | war/modules/Procs.tsx:6-84 | Inner Release (3 stacks), Primal Rend, Primal Ruination, Wrathful: Major at 1 | yes | yes | casts in downtime don't consume |
| war/Infuriate/nascent-chaos-* | war/modules/Infuriate.tsx:11-60 | Nascent Chaos dropped or overwritten: Major at 1 | yes | yes | an overwrite to avoid capping charges counts |
| war/OGCDDowntime/* | war/modules/OGCDDowntime.ts:4-43 | Infuriate (first use 2.5s, −5s per spender), Inner Release (15s, hold 2.5s), Upheaval / Orogeny (12.5s), Onslaught (18.5s, charges): checklist 95% | yes / indirect | yes | phase holds count |
| war/AoE/* | war/modules/AoE.ts:3-19 | Chaotic Cyclone, Decimate under 3; Overpower under 2: Minor 1, Medium 4, Major 7 | yes | yes | — |
| war/Combos/broken | war/modules/Combos.ts:3-5; core | Minor 1, Medium 2, Major 4 | yes | yes | — |
| war/Tincture/gcd-count | war/modules/Tincture.tsx:8-32 | min(12, ⌈(len − 250ms) ÷ GCD⌉): Minor 1, Medium 2, Major 3 | yes | yes | — |
| war/Tincture/expected-actions | Tincture.tsx:34-72 | fixed action groups: Minor 1, Medium 2, Major 3 | yes | yes | — |
| war/Tomahawk/disengage-count | war/modules/Tomahawk.tsx:5-12 | statistic | — | yes | — |

## Open

In priority order (biggest damage cost first):

1. **war/Procs/dropped-primal-wrath, nascent-chaos-dropped**: not seen.
2. **war/OGCDDowntime/infuriate**: compared, xivanalysis's count not
   adopted (see the row).
