# xivanalysis audit: Paladin

- **Clone:** xivanalysis `f532855e635bdfb4211cec8128d582dadfdc6a75`
  (2026-09-25). Records extracted 2026-10-15 by a Sonnet subagent (batch 1),
  spot-checked (3 of 3 matched their source); reconciled in the main session.
  Sources are relative to `src/parser/` in the clone.
- **Patch:** no patch branches in `jobs/pld`; supported 7.0–7.5. The
  module calls itself rudimentary: one changelog entry since 7.0
  (2024-07-21) and fixed 7.0 numbers (Fight or Flight 8 GCDs, tincture 12).
- **App:** `lib/damage/ffxiv/jobs/pld-war.ts` (header, `PLD_CHECKS`:
  `fightOrFlight`, `pldAoeCombo`, `atonementChainAtKill`,
  `atonementChainDropped`), `gauges.ts` (Oath lane, display only),
  `tracked-cooldowns.ts` ("Paladin"), generic checks. Case studies:
  jN3XDrf2z8PmLgRJ Vamp pull 8, 2T1HzdPKgbhM43am, qjCMx4bRfgNKwX9T fight 16,
  K6qfMamL7rN8yz2Q (three kills).

## Ledger

| id | status | app check | fires-on | notes |
|---|---|---|---|---|
| pld/FightOrFlight/gcd-count | verified | `fightOrFlight` expectedGcds 8 | Fight or Flight under 8 GCDs | jN3XDrf2z8PmLgRJ, 2T1HzdPKgbhM43am (6), fight 16 (10) and The Tyrant (6:13, 9:17) matched. Fight 16 needed the pre-pull Fight or Flight to be seen. |
| pld/FightOrFlight/high-potency-gcds | verified | `fightOrFlight` expected | Goring Blade, Confiteor or a Blade missing | Same windows. |
| pld/FightOrFlight/low-potency-gcd-group | verified | `fightOrFlight` Royal Authority group (3) | under 3 Royal Authority / Atonement / Supplication / Sepulchre / Holy Spirit | 2T1HzdPKgbhM43am 10, fight 16 12, Red Hot 7 matched. |
| pld/FightOrFlight/ogcds | verified | `fightOrFlight` expected | Blade of Honor, Expiacion, Circle of Scorn or Intervene missing | Fight 16 14, Red Hot 11, The Tyrant one for one. Some held across downtime into the next window (right). |
| pld/Requiescat/confiteor-chain | verified | `fightOrFlight` (Confiteor + Blades) + `requiescatChainLost` | a Requiescat window missing Confiteor or a Blade | Major at 1. Its one miss on 2T1HzdPKgbhM43am was the chain held past P1's HP check into P2, which is right. Gap found 2026-10-16: a Blade missing from Fight or Flight cost only its 25% ("used outside the window"), but when Requiescat ran out the Blade was never used at all. `requiescatChainLost` now values each step unpressed when Requiescat reaches its expiry or its last stack goes to another action (Holy Spirit, Clemency), at its average minus a combo filler (buff strips at deaths and wipes left out). Sample: 7HVZra4GNRxfpKzT (fetched for this; fight 3, Koneko Ashi, a low Red Hot and Deep Blue parse): 4:56 and 8:10, Blade of Truth and Valor never pressed (143k each). 17 on disk, e.g. the user's statics: 2T1HzdPKgbhM43am / yBKPqGwHparm7Tk4 3:35 (Jamie Rheinmetall's Clemency at 3:20.9 took a stack, so no Blade of Valor; 12k), qjCMx4bRfgNKwX9T pulls 2-3 7:29 (Shinsya Rei, Holy Spirit in Valor's place; 10-40k). Matched xivanalysis 2026-10-16 on 7HVZra4GNRxfpKzT: its 7 Blades missed are 4:24 ×2, 7:38 ×2, 8:42 ×1, 9:44 ×2; the app has the first five. 8:42 needed a fix: Requiescat was stripped at her death (9:05 strip, died 9:07) but a Fast Blade at 8:56 went out in Valor's place, so a chain a death ends now counts the steps other GCDs (not Goring Blade) took the place of. 9:44 is cut by the kill at 9:48 (fight-blind in xivanalysis), not adopted. Matched again 2026-10-16 on bVDR2mTL7YGvMxK1 Red Hot pull 1 (Kade Kansado): its 3 missed = the app's 7:54 chain (Blade of Faith, Truth, Valor; combo GCDs for 16s, then his death). |
| pld/Confiteor/timeouts | covered | `checkProcs` | Confiteor Ready expiring | Major at 1. Not fight-aware in xivanalysis (downtime, death). Searched 2026-10-16 (15 lowest Red Hot and Deep Blue Paladins): Confiteor Ready was used every time, even in chains that then ran out; the loss there is the Blades (row above). Not seen firing. |
| pld/RoyalAuthority/follow-up-skills | verified | `atonementChainDropped` + `atonementChainAtKill` | Atonement / Supplication / Sepulchre Ready lost | Checklist 94%. The Tyrant Sepulchre 24/26 and Vamp 21/22 built from it; 54 drops across the samples, nearly all Royal Authority pressed with Supplication or Sepulchre Ready up. |
| pld/DivineMight/stack-use | verified | `checkProcs` | Divine Might expiring | Checklist 94%. Fight 16 38/42 explained (2 forced, 1 real at 12:21, 1 at the kill); Red Hot 5:17 matched. |
| pld/Gauge/oath-gauge-overcap | no-damage | — | Oath Gauge over 100 | Mitigation. Drawn on the timeline (570 lost on Vamp, both tools). |
| pld/CooldownDowntime/uses | verified | `checkCooldownDrift` + `usesLostAtKill` | Fight or Flight, Imperator, Expiacion, Circle of Scorn or Intervene held | Intervene drift matched on three kills (~5-7 lost). Expiacion / Circle 20/21 at The Tyrant not adopted (ready 12-13s before the kill, under the kill rule's 15s). |
| pld/Combos/broken | verified | `checkCombos` | a broken or timed-out combo | Vamp 0:35 and The Tyrant 2:32 matched. |
| pld/Tincture/gcd-count | superseded | tincture.ts | under 12 GCDs in the tincture | The Tyrant 6:03's 10/12 was the Flatliner launch and towers. |
| pld/Tincture/tracked-actions | superseded | tincture.ts | 8 burst actions missing under the tincture | Fight 16's "6 tincture actions" became the placement finding (0:04 → 1:57, 7:43 → 7:53). |
| pld/Tincture/medicated-window | no-damage | — | — | Table only. |
| pld/AlwaysBeCasting/uptime | superseded | `checkGcdGaps` | idle GCD time | Red Hot 93.7% / 94.0%. Its gaps at 0:31, 1:40, 3:49 on Vamp are shared movement (forced). |
| pld/Weaving/too-many | verified | `checkGcdGaps` | triple weaves | The Tyrant 1:06 tank-swap triple weave matched. Its 0.08s weaves are inside the 0.15s tolerance. Sprint and gap closers in a weave are movement now (6:29, 7:39). |
| pld/Death/died | covered | `checkDeaths` | a death | Generic. |

Core modules that can't fire for Paladin: DoTs (Goring Blade's DoT isn't
tracked), Positionals, Swiftcast, Lucid, Overheal. xivanalysis has no
Paladin AoE module; the app checks Total Eclipse / Prominence on one
target anyway (`pldAoeCombo`).

**Display only, no rule:** Defensives, timeline rows, the tincture table,
the Oath graph.

## Records

| id | source | trigger / threshold | damage | log-visible | doubts |
|---|---|---|---|---|---|
| pld/FightOrFlight/gcd-count | pld/modules/FightOrFlight.tsx:10-25, 50-60 | min(8, ⌈(len − 250ms) ÷ GCD⌉): Minor 1, Medium 2, Major 4 | yes | yes | downtime in the window counts |
| pld/FightOrFlight/high-potency-gcds | FightOrFlight.tsx:62-78 | Goring Blade, Confiteor, Blade of Faith / Truth / Valor once each: Minor 1, Medium 2, Major 4 | yes | yes | — |
| pld/FightOrFlight/low-potency-gcd-group | FightOrFlight.tsx:80-99 | 3 of Royal Authority / Atonement / Supplication / Sepulchre / Holy Spirit: Minor 1, Medium 2, Major 4 | yes | yes | double counts a short window |
| pld/FightOrFlight/ogcds | FightOrFlight.tsx:101-116 | Blade of Honor, Expiacion, Circle of Scorn, Intervene once each: Minor 1, Medium 5 | yes | yes | holds across downtime count |
| pld/Requiescat/confiteor-chain | pld/modules/Requiescat.tsx:51-113 | Confiteor and the three Blades in each Requiescat window (−1 each when downtime leaves under a GCD): Major at 1 | yes | yes | — |
| pld/Confiteor/timeouts | pld/modules/Confiteor.tsx:11-71 | Confiteor Ready removed with no Confiteor: Major at 1 | yes | yes | downtime, death and the kill not excused |
| pld/RoyalAuthority/follow-up-skills | pld/modules/RoyalAuthority.tsx:9, 33-166 | Atonement / Supplication / Sepulchre uses ÷ grants: checklist 94% | yes | yes | one total feeds all three |
| pld/DivineMight/stack-use | RoyalAuthority.tsx:11, 60-70, 100-110, 168-184 | Holy Spirit / Holy Circle uses ÷ Divine Might grants: checklist 94% | yes | yes | — |
| pld/Gauge/oath-gauge-overcap | pld/modules/Gauge.tsx:13-69 | always a Minor suggestion with the overcap | no | no (inferred) | — |
| pld/CooldownDowntime/uses | pld/modules/CooldownDowntime.tsx:3-31 | Fight or Flight, Imperator, Expiacion, Circle of Scorn, Intervene (charges), with offsets; checklist 95% | yes | yes | phase holds count |
| pld/Combos/broken | pld/modules/Combos.tsx:4-7; core | core rule: Minor 1, Medium 2, Major 4 | yes | yes | — |
| pld/Tincture/gcd-count | pld/modules/Tincture.tsx:9-32 | min(12, ⌈(len − 250ms) ÷ GCD⌉): Minor 1, Medium 2, Major 3 | yes | yes | no downtime allowance |
| pld/Tincture/tracked-actions | Tincture.tsx:34-58 | 8 actions once each: Minor 2, Medium 4, Major 6 | yes | yes | — |

## Open

1. **pld/Confiteor/timeouts** (covered). Not seen firing (Confiteor Ready
   is pressed even by the weakest parses).
