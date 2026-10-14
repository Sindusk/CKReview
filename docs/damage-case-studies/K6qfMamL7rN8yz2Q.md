# Case study: K6qfMamL7rN8yz2Q (FFXIV)

"Prepull Sorry - Week 5 Reclears", savage reclears,
report started 2026-02-03, patch 7.4. Started 2026-10-14. Analysis starts
with Vamp Fatale (fight 1, the app's Pull 1, kill). xivanalysis pages for
all eight players on that kill are in `sampledata/damage-ff/`.

## Data on disk

- `sampledata/ff/K6qfMamL7rN8yz2Q/` — all 14 fights, full captures:
  Vamp Fatale (fight 1, kill), Red Hot and Deep Blue (2 wipe, 3 kill),
  The Tyrant (4 wipe, 5 kill), Lindwurm (6-7 wipes, 8 kill), Lindwurm II
  (9-13 wipes, 14 kill). Baseline `expectations/ff-K6qfMamL7rN8yz2Q.json`
  created 2026-10-14 (173 entries, no rulings).
- Every boss has a damage context.

## Done

- **GCD drift noise (user: "18 GCD drifts for Sin, xivanalysis finds 5").**
  Sin Dusk (Sage, GCD 2.41s). Of the app's 18 `gcd-drift` entries, nine
  were 0.0-0.3s delays (0.17-0.44s past the GCD before the 0.15s
  tolerance): five were one oGCD woven late in the GCD (Kerachole,
  Ixochole, Zoe after Dosis III; Holos after Phlegma), four single late
  presses. Not adopted as findings: FFXIV small delays now need 0.35s
  unforced (`DamageGame.smallDelayMinMs`, lib/damage/ffxiv/game.ts);
  triple-weave clips keep no floor; WoW unchanged. Sin: 18 → 9 entries,
  lost 650k → 629k. Party on this kill: 122 → 39 drift/clip entries.
  - The other nine stand, and xivanalysis's method is why it lists fewer
    (header of lib/damage/checks.ts):
    - Its 5 match ours: gap 7:13 (ours 7:14, 2.0s; it says 0.75s because
      it measures from the Dosis's cast end, not its start) and
      interrupts 1:30, 1:59, 4:03, 7:58 (ours 1:29 1.5s, 1:58 2.2s,
      4:02 2.3s, 8:01 0.8s: the idle, where it lists the cancelled cast's
      1.44s).
    - Four it can't see: 5:15 0.7s (Haima woven 2.27s into the GCD),
      5:21 0.4s after Eukrasia (1.51s for a 1.0s GCD), 7:02 0.6s after
      Eukrasian Prognosis II (2.27s for 1.5s), 5:43 0.4s after Pneuma.
      Its GCD Downtime needs a window over the full GCD + 150ms measured
      from a hard cast's end, which hides ~1.6s after every Dosis and ~1s
      after Eukrasian GCDs.

## Next

- Per player on Vamp Fatale against their xivanalysis pages (step 3):
  Sin Dusk (SGE) first for the rest of their page (DoTs, Zoe,
  Swiftcast, tincture), then Mocha Dreams (VPR), Kevin Brachydiar (PCT),
  Yoro Shiku, Chauzey Solstice, Kade Kansado, Siegward Damvir,
  Sayacissa Morsaelth.
