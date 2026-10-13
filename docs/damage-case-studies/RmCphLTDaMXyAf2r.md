# Case study: RmCphLTDaMXyAf2r fight 3 (FFXIV)

M12S (Lindwurm II) kill, 8:46, patch 7.5; app Pull 1. Recorded by the
Gunbreaker (Jamie Rheinmetall). Started 2026-10-13 to settle the FFXIV
GCD-timing question (docs/open-items.md), not as a per-player
xivanalysis study.

## Data on disk

- `sampledata/ff/RmCphLTDaMXyAf2r/` — the kill only (fight 3, full
  capture, 3.4MB). Fight 1 (M12S part 1, Lindwurm, kill) isn't fetched.
  No mechanic baselines yet. Damage context for Lindwurm II: MISSING.
- The pull file's combatantInfo keeps skill / spell speed (fetch change
  of 2026-10-13): Jamie 420 / 420, so exactly 2.50s.

## Done

- GCD tier: Jamie's gaps cluster at 2.49-2.50 (137), 2.53-2.55 (30),
  2.46 (5, all paybacks); the 10ms mode read 2.49. Together with
  qjCMx4bRfgNKwX9T fight 1's recorder (Dark Knight, skill speed 420)
  this calibrated `timeline.ts gcdTierMs`, which replaced the mode for
  every FFXIV player and GNB's own mean (the method and numbers are in
  the comment above it). Frail (qjCMx4bRfgNKwX9T fight 16) is 2.45; the
  GNB header records the No Mercy consequence.

## Next

- If the user brings xivanalysis pages for this kill: start the
  per-player study (procedure in the /damage-analysis skill).
- `/build-fight-context` for Lindwurm II (context MISSING).
- Viper's tier (docs/open-items.md, "FFXIV GCD identification").
