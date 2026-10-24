# gTkMH91DWRmLbNCn — Day 43, Dancing Mad (patch 7.5, 13 wipes)

No kill and no xivanalysis pages: a targeted fix, not a per-player study.

## Done (2026-10-24)

- **Dancer Technical Step opener read as drift.** The DNC dances Technical
  Step before the pull (Quadruple Technical Finish at 0:02, next Step at
  1:56). The drift engine saw no pre-pull use, so the first 116s read as
  "sat ready": Pull 3 125.0s / 1 use lost (450k), Pull 8 125.3s / 1 use
  lost (494k). Fixed in `lib/damage/ffxiv/tracked-cooldowns.ts`: Technical
  Step takes the Technical Finish actions as `prePullEvidence`, as Standard
  Step already did with Standard Finish. Both pulls now have no drift
  finding (about 10s unforced left at 16:01-16:11, under a use).

## Next

Nothing open. A per-player study needs a kill and the players' xivanalysis
pages.
