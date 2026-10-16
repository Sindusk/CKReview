# xivanalysis audit: Pictomancer

- **Clone:** xivanalysis `f532855e635bdfb4211cec8128d582dadfdc6a75`
  (2026-09-25). Records extracted 2026-10-15 by a Sonnet subagent (batch 1),
  spot-checked (3 of 3 matched their source); reconciled in the main session.
  Sources are relative to `src/parser/` in the clone.
- **Patch:** `patch.is('7.2')` branches in `CooldownDowntime.tsx` (Striking
  Muse not tracked in 7.2) and `StarryMuse.tsx` (Hammers may be traded for
  Subtractive spells; no Additive check; a 9-GCD display column). Supported
  7.0–7.5.
- **App:** `lib/damage/ffxiv/jobs/caster.ts` (header, `PCT_CHECKS`:
  `starryMuse`, `starryFillers`, `palette`, `pctAoe`, `portraitOverwrites`), `gauges.ts`
  (Palette, Paint), `tracked-cooldowns.ts` ("Pictomancer"), generic checks.
  Case studies: dQ8wmb1VhKt6yBXk, dDar482XvFKBPJYh FRU (7.1),
  qjCMx4bRfgNKwX9T (7.5), K6qfMamL7rN8yz2Q (three kills).

## Ledger

| id | status | app check | fires-on | notes |
|---|---|---|---|---|
| pct/StarryMuse/expected-actions-hammer | verified | `starryMuse` Hammer GCD | under 3 Hammers in Starry Muse | Matched on FRU (11 actions) and qjCMx4bRfgNKwX9T (15). The 7.2 trade is ported. K6qfMamL7rN8yz2Q 8:09: xivanalysis 1/3 is overstated (a Hammer cast at the window's end carries the buff); the app says 2/3. |
| pct/StarryMuse/expected-actions-star-prism | verified | `starryMuse` Star Prism | no Star Prism | Same windows. |
| pct/StarryMuse/expected-actions-rainbow-drip | verified | `starryMuse` Rainbow Drip | no Rainbow Drip (0 if a motif was painted) | Same adjustment. vVPtwaTQ62Jg391q Lindwurm II pull 4 (2026-10-16): its 6:19 Rainbow Drip = the app's; its other 4 misses are the 8:21 window the kill cut to 11s (Rainbow Drip, 3 Subtractive spells), which the app doesn't judge. That page also matched the portrait overwrite (2:21). |
| pct/StarryMuse/expected-actions-comet | verified | `starryMuse` Comet in Black | no Comet | qjCMx4bRfgNKwX9T 14:04 matched. |
| pct/StarryMuse/expected-actions-subtractive | verified | `starryMuse` Subtractive spell | under 3 Subtractive spells (−2 with a motif, −1 with a carried Comet; 7.2 +1) | Same adjustments, patch-gated the same way. Neither counts AoE Subtractive spells. |
| pct/StarryMuse/expected-actions-muse | verified | `starryMuse` Living Muse | no Living Muse (xivanalysis: 1 + motifs painted) | The app expects 1 regardless of motifs. |
| pct/StarryMuse/expected-actions-portrait | verified | `starryMuse` Mog / Madeen | neither Mog of the Ages nor Retribution of the Madeen | — |
| pct/StarryMuse/limited-additive | verified | `starryFillers` | an Additive spell inside Starry Muse | FRU 1 and qjCMx4bRfgNKwX9T 6:03 matched. Skipped on 7.2 in both. The app judges by when the spell lands. |
| pct/StarryMuse/gcd-count-72 | superseded | `starryMuse` | under 9 GCDs (7.2 only) | Display only. |
| pct/Procs/dropped-hammer-time | verified | `checkProcs` (stacks; declared Hammer Stamp, against Fire in Red) | Hammer Time stacks expiring | Hammers held out of the last window are a burst-window finding instead. Never fired before 2026-10-16: Stamp, Brush and Polishing split the removals, under the consumer inference's 60%. Declared now, each stack its Hammer Stamp average less a Fire in Red. Sample: 9zdH43vCn8Dr2Nqm (fetched for this; fight 5, Iloya Maeve, a low Red Hot and Deep Blue parse): 0:33.3 (2 stacks), 2:14.9 (3), 4:22.6 (2), 152-228k. On disk ~20 on Kevin Brachydiar's Lindwurm / Lindwurm II wipes (AYQm9Kd8Ct4FxcGp pull 5 1:27.7 hand-checked: Hammers held from 0:56.8 to 1:22, Smudge in Polishing Hammer's slot, ran out). Matched xivanalysis 2026-10-16: 7 stacks = 7. |
| pct/Procs/dropped-rainbow-bright | covered | `checkProcs` | Rainbow Bright expiring | Not seen firing. |
| pct/Procs/dropped-starstruck | covered | `checkProcs` | Starstruck expiring | Not seen firing. |
| pct/Procs/dropped-aetherhues | covered | `checkProcs` | Aetherhues / Aetherhues II expiring (the paint combo running out) | Not seen firing. Several consumers (single and AoE); checkProcs takes a second one only past 10% of removals. |
| pct/Procs/dropped-hyperphantasia | covered | `hyperphantasiaLost` | Hyperphantasia stacks expiring unused | Consumed by every Additive and Subtractive spell, so `checkProcs` finds no single consumer and skips it. A lost stack can cost Rainbow Bright (an instant Rainbow Drip). Premise check (2026-10-16), 670 Hyperphantasia windows on the 263 Pictomancer pulls on disk: 636 used all 5 stacks, 9 more. Every short one ended in the player's death (all statuses removed at once) or the wipe; xivanalysis counts those. Built 2026-10-16 once a living one showed up on 9zdH43vCn8Dr2Nqm's page (Iloya Maeve, "2 stacks unused"): Starry Muse 8:49.2 spent on Star Prism, Comet, a hardcast Pom Motif and Holy, ran out 9:19.8. A window reaching its 30s expiry without Rainbow Bright loses a Rainbow Drip less a Fire in Red (89k there); deaths, wipe strips and the kill aren't counted. Also fires on Brk8fQGnhJaxFKvb (Nyclatus Noctula) 7:06 and 9:17 (25k: hammers and Mog in the window, no Rainbow Bright). Stack removals can go unlogged (none logged in Iloya's last window), so it reads Rainbow Bright, not the stacks. |
| pct/Procs/core-dropped-overwritten-invuln-off | no-damage | — | — | A table only; the job's own suggestions above are the rules. |
| pct/Gauge/palette-overcap | verified | `palette` (gaugeFindings) | Palette over 100 | FRU 1 matched. The app also finds 25 over at K6qfMamL7rN8yz2Q The Tyrant 1:55 (85k), app-only and holding. Gauge comes with the cast, not the hit. |
| pct/Gauge/overwrote-monochrome-tones | verified | `palette` Monochrome Tones | Subtractive Palette with Monochrome Tones still up | FRU 1 matched. |
| pct/Gauge/overwrote-portrait | verified | `portraitOverwrites` | a Winged / Fanged Muse while a portrait is still held | Built 2026-10-16: the lost Mog of the Ages / Retribution of the Madeen at its average; forced when under 2.5s outside forced time and death was left after the shared 30s recast. 7 in 992 muses on disk, all unforced, 138-190k: bVDR2mTL7YGvMxK1 The Tyrant pull 11 10:05, rFQT8XZckzvH1LNx Queen Eternal pull 1 2:12, vFY7kHVWK19ZQ24A Lindwurm II pulls 6, 11, 13, vVPtwaTQ62Jg391q The Tyrant pull 2 6:20 and Lindwurm II pull 4 2:21 (kill; hand-checked: the 1:16 Madeen held through the 2:12 Starry Muse, no Madeen hit in between). Six are one player. Matched xivanalysis 2026-10-16 on bVDR2mTL7YGvMxK1 The Tyrant pull 11 (Kevin Brachydiar): 1 = 1 (10:05); its Monochrome Tones overwrite (1, 2:30) matched too. |
| pct/CooldownDowntime/uses | verified | `checkCooldownDrift` + `usesLostAtKill` | Living, Striking or Starry Muse held | The Tyrant 100%; Living Muse 14/16 and 15/16 matched by the kill rule. Striking Muse is skipped on 7.2 logs since 2026-10-16, as in xivanalysis (`notOnPatches`). The two 7.2 reports on disk (Y9Fh2BHyj3xAqZ6V, wNHvD38WTbFtGJKr) had no Striking Muse finding before or after. |
| pct/AoEUsages/too-few-targets | verified | `pctAoe` (minimum 3) | an AoE paint spell on under 3 targets | K6qfMamL7rN8yz2Q Red Hot and Deep Blue 8:46.5 built from it. The app skips a use that out-did the single-target average. |
| pct/Weaving/too-many | verified | `checkGcdGaps` | weaves past the GCD after a long cast | K6qfMamL7rN8yz2Q 2:28, 7:03, 7:41, 9:35 matched. xivanalysis computes max weaves from cast and recast for motifs; the app counts the idle. |
| pct/Interrupts/cancelled-casts | verified | `checkInterrupts` | a cast cut by movement | 3 (qjCMx4bRfgNKwX9T, K6qfMamL7rN8yz2Q Vamp) and 5 (The Tyrant) matched. |
| pct/AlwaysBeCasting/uptime | superseded | `checkGcdGaps` | idle GCD time | Uptime 94.2% vs 94.3% on Red Hot and Deep Blue; downtimes match by time. |
| pct/Swiftcast/bad-use | no-damage | — | Swiftcast unused or on a short cast | Not adopted (utility). |
| pct/Death/died | covered | `checkDeaths` | a death | Generic. |

Core modules that can't fire for Pictomancer: DoTs, Combos (paint combos
are statuses), Positionals, Lucid / Overheal rules.

**Display only, no rule:** Palette / Paint / Canvas / Depiction / Portrait
graphs, the timeline rows, Defensives (Tempera Coat), Tincture, Utilities
(Swiftcast / Lucid), Inspiration (a cast-time model), Starry Muse's
players-buffed and overwrite columns.

## Records

| id | source | trigger / threshold | damage | log-visible | doubts |
|---|---|---|---|---|---|
| pct/StarryMuse/expected-actions-* | pct/modules/StarryMuse.tsx:60-106, 129-206; core ExpectedActionGroupsEvaluator.tsx | per window: Hammers 3 (7.2: trailing ones may drop), Star Prism 1, Rainbow Drip 1 (0 with a motif), Comet 1 + extra, Subtractive 3 (−2 motif, −1 carried Comet; 7.2 +1), Muse 1 + motifs, Mog / Madeen 1. One shared suggestion: Minor 1, Medium 3, Major 5 | yes | yes (Paint / portrait inferred) | no end-of-pull or downtime excuse; AoE Subtractive spells not counted |
| pct/StarryMuse/limited-additive | StarryMuse.tsx:108-126 | any Additive spell (Holy in White included) in the window; off on 7.2. Minor 1, Medium 3, Major 5 | yes | yes | AoE pulls |
| pct/StarryMuse/gcd-count-72 | StarryMuse.tsx:46-57 | min(9, ⌈(len − 250ms) ÷ GCD⌉); IGNORE; 7.2 only | yes | yes | — |
| pct/Procs/dropped-aetherhues | pct/modules/Procs.tsx:18-26, 66-79 | Aetherhues / II windows with no consumer. Minor 1, Medium 3, Major 5 | yes | yes | — |
| pct/Procs/dropped-rainbow-bright | Procs.tsx:27-32, 81-90 | Medium 1, Major 2 | yes | yes | — |
| pct/Procs/dropped-starstruck | Procs.tsx:33-38, 92-101 | Medium 1, Major 2 | yes | yes | — |
| pct/Procs/dropped-hyperphantasia | Procs.tsx:39-42, 52-55, 103-116 | stacks lost = 5 − consumers per window. Medium 1, Major 2 | yes | yes | — |
| pct/Procs/dropped-hammer-time | Procs.tsx:43-50, 118-132 | stacks lost = 3 − consumers. Minor 1, Medium 3, Major 5 | yes | yes | — |
| pct/Procs/rainbow-bright-instant-adjustment | Procs.tsx:12-13, 58-64 | sets Rainbow Drip instant and −3.5s recast under Rainbow Bright (a timing model, no rule) | — | yes | — |
| pct/Gauge/palette-overcap | pct/modules/Gauge.tsx:77-98, 302-314 | ⌊overcap ÷ 50⌋ lost Subtractive Palettes; +25 per Water hit, −50 per Palette (not under Subtractive Spectrum). Medium 1, Major 2 | yes | no (inferred) | +25 per damage event can overcount on AoE Water II |
| pct/Gauge/overwrote-monochrome-tones | Gauge.tsx:316-326, 398-404 | Subtractive Palette with Monochrome Tones on. Medium 1, Major 2 | yes | yes | — |
| pct/Gauge/overwrote-portrait | Gauge.tsx:327-340, 444-467 | Winged / Fanged Muse while a portrait is held. Medium 1, Major 2 | yes | no (inferred) | a carried-in portrait on pull 1 |
| pct/CooldownDowntime/uses | pct/modules/CooldownDowntime.tsx:3-40 | Living Muse group, Striking Muse (not in 7.2), Starry Muse; hold 1.25s; no first-use offsets. Checklist 95% | yes | yes | phase holds count |
| pct/AoEUsages/too-few-targets | pct/modules/AoEUsages.ts:3-37 | six AoE paint spells under 3 targets. Minor 1, Medium 4, Major 7 | yes | yes | Holy / Comet / Rainbow Drip not paired |
| pct/Weaving/too-many | pct/modules/Weaving.ts:5-36 | after long casts: max weaves = round((recast − cast − 600ms) ÷ 600ms); else core. Medium 1, Major 5 | yes | yes | 600ms lock is a hand-wave |
| pct/Interrupts, AlwaysBeCasting, Swiftcast, Death | core (Swiftcast text only) | core rules; Swiftcast Major at 1 | yes / no | yes | — |

## Open

In priority order (biggest damage cost first):

1. **pct/Procs/dropped-hammer-time** (verified 2026-10-16:
   9zdH43vCn8Dr2Nqm's 7 stacks = the app's 2 + 3 + 2; its Monochrome
   Tones overwrite 1 = 1).
   **rainbow-bright, starstruck, aetherhues** (covered): the 10 lowest
   Red Hot and Deep Blue Pictomancers (ff-probe.js) lost Starstruck once
   (NjKbPXFH27v6wkWQ 8:35) and Aetherhues at combo timeouts only.
2. **pct/Procs/dropped-hyperphantasia** (covered 2026-10-16, matched in
   kind on 9zdH43vCn8Dr2Nqm; see the row). Before: only deaths and
   wipes drop stacks on disk.
