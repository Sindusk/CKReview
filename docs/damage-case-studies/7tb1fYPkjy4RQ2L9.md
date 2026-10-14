# Case study: 7tb1fYPkjy4RQ2L9 (FFXIV)

AAC Heavyweight, Vamp Fatale kill (fight 26, the app's Pull 1), report
started 2026-01-10. Started 2026-10-13; one question from the user about
the Dancer, Chauzey Solstice.

## Data on disk

- `sampledata/ff/7tb1fYPkjy4RQ2L9/` — the kill only, full capture. No
  mechanic baselines; Vamp Fatale has no damage context.

## Done

- **Pre-Technical Step: Saber Dance (enter burst empty) or Cascade (combo
  drops)?** The app's three "Cascade's combo ran out" findings (2:00, 4:01,
  7:59, 20k each) are all the Cascade pressed just before Technical Step.
  Esprit isn't logged; it was simulated with xivanalysis's Gauge.tsx rules
  (self +5 combo / +10 proc / Tillana +50, party +10 at 20% per GCD hit
  under Esprit, expected values; scratchpad script, not kept). Each window
  (2:09, 4:09, 8:09) held 8 spender GCDs and entered with ~25-55 Esprit.
  - 2:00: Saber instead of Cascade leaves the window ~55 Esprit short, one
    spender: a buffed Saber (95.6k) becomes a buffed proc filler (~70k est.),
    while the unbuffed slot gains Saber over filler (~55k vs 40.2k). With a
    dropped combo's real cost (~9k, below) the two lines are within ~2k.
  - 4:01: Saber wasn't possible (~14-23 Esprit). Cascade 3:58 → Fountain
    4:01 instead of Saber → Cascade keeps the combo and enters with ~78
    Esprit; the extra Saber goes in the window in place of the 4:28 Last
    Dance (Last Dance Ready runs to 4:48), avoiding the overcap at Tillana.
    Saves the drop for nothing.
  - 7:59: no Esprit, no procs; only earlier sequencing avoids it.
- **Valuation found:** checks.ts `droppedCombos` values a drop at the
  follow-up's combo part (Fountain 35.0k × 57% = 20k). In the log the drop
  turns one Fountain into a restart Cascade: 35.0k − 28.4k, plus the proc
  difference (50% × Fountainfall 40.2k − Reverse Cascade 34.7k) ≈ 9k.

- **Fixed (user, 2026-10-13):** dropped combos are now valued as best
  follow-up average − the chain's most-used starter average (checks.ts
  `droppedCombos`). This kill's three drops: 20k → 7k each. The proc
  difference isn't added (job-specific).

## Next

- Nothing open for this question.
