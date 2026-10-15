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
  `starryMuse`, `starryFillers`, `palette`, `pctAoe`), `gauges.ts`
  (Palette, Paint), `tracked-cooldowns.ts` ("Pictomancer"), generic checks.
  Case studies: dQ8wmb1VhKt6yBXk, dDar482XvFKBPJYh FRU (7.1),
  qjCMx4bRfgNKwX9T (7.5), K6qfMamL7rN8yz2Q (three kills).

## Ledger

| id | status | app check | fires-on | notes |
|---|---|---|---|---|
| pct/StarryMuse/expected-actions-hammer | verified | `starryMuse` Hammer GCD | under 3 Hammers in Starry Muse | Matched on FRU (11 actions) and qjCMx4bRfgNKwX9T (15). The 7.2 trade is ported. K6qfMamL7rN8yz2Q 8:09: xivanalysis 1/3 is overstated (a Hammer cast at the window's end carries the buff); the app says 2/3. |
| pct/StarryMuse/expected-actions-star-prism | verified | `starryMuse` Star Prism | no Star Prism | Same windows. |
| pct/StarryMuse/expected-actions-rainbow-drip | verified | `starryMuse` Rainbow Drip | no Rainbow Drip (0 if a motif was painted) | Same adjustment. |
| pct/StarryMuse/expected-actions-comet | verified | `starryMuse` Comet in Black | no Comet | qjCMx4bRfgNKwX9T 14:04 matched. |
| pct/StarryMuse/expected-actions-subtractive | verified | `starryMuse` Subtractive spell | under 3 Subtractive spells (−2 with a motif, −1 with a carried Comet; 7.2 +1) | Same adjustments, patch-gated the same way. Neither counts AoE Subtractive spells. |
| pct/StarryMuse/expected-actions-muse | verified | `starryMuse` Living Muse | no Living Muse (xivanalysis: 1 + motifs painted) | The app expects 1 regardless of motifs. |
| pct/StarryMuse/expected-actions-portrait | verified | `starryMuse` Mog / Madeen | neither Mog of the Ages nor Retribution of the Madeen | — |
| pct/StarryMuse/limited-additive | verified | `starryFillers` | an Additive spell inside Starry Muse | FRU 1 and qjCMx4bRfgNKwX9T 6:03 matched. Skipped on 7.2 in both. The app judges by when the spell lands. |
| pct/StarryMuse/gcd-count-72 | superseded | `starryMuse` | under 9 GCDs (7.2 only) | Display only. |
| pct/Procs/dropped-hammer-time | covered | `checkProcs` (stacks) | Hammer Time stacks expiring | Not seen firing. Hammers held out of the last window are a burst-window finding instead. |
| pct/Procs/dropped-rainbow-bright | covered | `checkProcs` | Rainbow Bright expiring | Not seen firing. |
| pct/Procs/dropped-starstruck | covered | `checkProcs` | Starstruck expiring | Not seen firing. |
| pct/Procs/dropped-aetherhues | covered | `checkProcs` | Aetherhues / Aetherhues II expiring (the paint combo running out) | Not seen firing. Several consumers (single and AoE); checkProcs takes a second one only past 10% of removals. |
| pct/Procs/dropped-hyperphantasia | candidate | — | Hyperphantasia stacks expiring unused | Consumed by every Additive and Subtractive spell, so `checkProcs` finds no single consumer and skips it. A lost stack can cost Rainbow Bright (an instant Rainbow Drip). Value it at the Rainbow Drip's cast time saved, not a whole spell. |
| pct/Procs/core-dropped-overwritten-invuln-off | no-damage | — | — | A table only; the job's own suggestions above are the rules. |
| pct/Gauge/palette-overcap | verified | `palette` (gaugeFindings) | Palette over 100 | FRU 1 matched. The app also finds 25 over at K6qfMamL7rN8yz2Q The Tyrant 1:55 (85k), app-only and holding. Gauge comes with the cast, not the hit. |
| pct/Gauge/overwrote-monochrome-tones | verified | `palette` Monochrome Tones | Subtractive Palette with Monochrome Tones still up | FRU 1 matched. |
| pct/Gauge/overwrote-portrait | candidate | — | a Winged / Fanged Muse while a portrait is still held | A lost Mog of the Ages or Madeen. Gauge-inferred from muse and portrait casts, so log-checkable from the cast order. Rare. |
| pct/CooldownDowntime/uses | verified | `checkCooldownDrift` + `usesLostAtKill` | Living, Striking or Starry Muse held | The Tyrant 100%; Living Muse 14/16 and 15/16 matched by the kill rule. **Patch gap:** the app tracks Striking Muse in 7.2 too, where xivanalysis drops it ("not strictly a gain"). |
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

1. **pct/Procs/dropped-hyperphantasia** (candidate). The generic proc check
   skips it (many consumers). Premise check: find a pull where stacks run
   out, and value what the lost Rainbow Bright cost.
2. **pct/CooldownDowntime/uses, 7.2 Striking Muse.** Gate it out of the
   tracked cooldowns on 7.2 logs, as xivanalysis does, once a 7.2 pull is
   on disk to check it against.
3. **pct/Gauge/overwrote-portrait** (candidate, rare).
4. **pct/Procs/dropped-hammer-time, rainbow-bright, starstruck,
   aetherhues** (covered). None seen firing.
